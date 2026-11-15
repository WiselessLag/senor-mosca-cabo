"""Brian2 simulation adapter. Delivers measured events, independent of game rules."""
from dataclasses import dataclass
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from threading import Lock

import brian2 as b
import numpy as np

DURATION = 300
CHUNK = 30
ROOT = Path(__file__).resolve().parents[1]
SPECS = {
    "model.py": "5ba7083cf55bf6092967f8d9065e86cd677efed1",
    "Completeness_783.csv": "b5a26b82b69a3c2e7fd99cd6810c36fc8f0e492b",
    "Connectivity_783.parquet": "d386555d1a5f40ebfa1380bcb05b1fab044855fd",
}
SIMULATION_LOCK = Lock()


@dataclass
class Circuit:
    network: b.Network
    monitor: b.SpikeMonitor
    panels: list[list[int]]
    neuron_count: int
    root_ids: list[list[str]] | None = None


def upstream_path() -> Path:
    return Path(os.environ.get("MOSCA_SHIU_DIR", ROOT/"upstream")).expanduser().resolve()


def unavailable() -> str | None:
    directory = upstream_path()
    missing = [name for name in SPECS if not (directory/name).is_file()]
    if missing:
        return "Faltan archivos de FlyWire v783: " + ", ".join(missing) + ". Consulta docs/FLYWIRE.md."
    if any(importlib.util.find_spec(name) is None for name in ("pandas", "pyarrow", "joblib")):
        return "Instala las dependencias de requirements-flywire.txt."
    return None


def verify_upstream(directory: Path):
    # Git blob IDs pin source and data; text checkout may use CRLF on Windows.
    for name, expected in SPECS.items():
        contents = (directory/name).read_bytes()
        if name.endswith((".csv", ".py")):
            contents = contents.replace(b"\r\n", b"\n")
        blob = hashlib.sha1(f"blob {len(contents)}\0".encode())
        blob.update(contents)
        if blob.hexdigest() != expected:
            raise ValueError(f"{name} no coincide con el archivo v783 fijado. Consulta docs/FLYWIRE.md.")


def drive(neurons, targets, rates, jump, clock, latency_scale=0.0):
    """Regular, staggered pulses keep runs reproducible; this is game instrumentation."""
    events = []
    for i, rate in enumerate(rates):
        period = 1000 / rate if rate else float("inf")
        if not rate:
            continue
        phase = 5 + (i % 3)*1.1 + latency_scale*(max(rates)-rate)
        events.extend((round(float(t), 4), i) for t in np.arange(phase, DURATION, period))
    events.sort()
    pulses = b.SpikeGeneratorGroup(len(targets), [i for _, i in events],
        [t for t, _ in events]*b.ms, sorted=True, clock=clock)
    inject = b.Synapses(pulses, neurons, on_pre="v_post += jump", namespace={"jump": jump}, clock=clock)
    inject.connect(i=list(range(len(targets))), j=targets)
    return pulses, inject


def demo(rates) -> Circuit:
    clock = b.Clock(dt=0.1*b.ms)
    neurons = b.NeuronGroup(21, "dv/dt=(-v+g)/(20*ms) : volt\ndg/dt=-g/(5*ms) : volt",
                            threshold="v > 7*mV", reset="v=0*mV; g=0*mV",
                            refractory=2.2*b.ms, method="exact", clock=clock)
    syn = b.Synapses(neurons, neurons, "w : volt", on_pre="g_post += w", delay=1.8*b.ms, clock=clock)
    source, dest, weights = [], [], []
    panels = [list(range(3+i*6, 9+i*6)) for i in range(3)]
    for i, panel in enumerate(panels):
        for j, target in enumerate(panel):
            source += [i, (i+1)%3, target]
            dest += [target, target, panels[(i+1)%3][j]]
            weights += [42+2*j, 4, -1.5]
    syn.connect(i=source, j=dest)
    syn.w = weights*b.mV
    pulses, inject = drive(neurons, [0, 1, 2], rates, 25*b.mV, clock)
    monitor = b.SpikeMonitor(neurons)
    return Circuit(b.Network(neurons, syn, pulses, inject, monitor), monitor, panels, len(neurons))


def full(rates) -> Circuit:
    import pandas as pd

    folder = upstream_path()
    verify_upstream(folder)
    spec = importlib.util.spec_from_file_location("shiu_research_model", folder/"model.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    comp, conn = folder/"Completeness_783.csv", folder/"Connectivity_783.parquet"
    roots = pd.read_csv(comp, index_col=0).index
    by_root = {str(root): i for i, root in enumerate(roots)}
    mapping = json.loads((ROOT/"backend/flywire_panels.json").read_text(encoding="utf-8"))
    targets = [by_root[panel["input"]] for panel in mapping]
    root_ids = [panel["readout"] for panel in mapping]
    panels = [[by_root[root] for root in panel] for panel in root_ids]

    params = module.default_params.copy()
    b.defaultclock.dt = 0.1*b.ms
    neurons, syn, monitor = module.create_model(comp, conn, params)
    neurons.rfc[targets] = 0*b.ms  # same input override as upstream poi()
    pulses, inject = drive(neurons, targets, rates, params["w_syn"]*params["f_poi"], neurons.clock,
                           latency_scale=0.9)
    return Circuit(b.Network(neurons, syn, monitor, pulses, inject), monitor, panels, len(neurons), root_ids)


def simulate(mode, rates):
    """Yield metadata and cumulative measurements after each 30 ms of simulated time."""
    if not SIMULATION_LOCK.acquire(blocking=False):
        raise RuntimeError("El laboratorio está ocupado. Intenta de nuevo.")
    try:
        if mode not in ("demo", "flywire") or len(rates) != 3 or not all(0 <= r <= 125 for r in rates):
            raise ValueError("Modo o estímulo no válido.")
        b.start_scope()
        b.prefs.codegen.target = "numpy"  # no C/C++ compiler needed
        circuit = demo(rates) if mode == "demo" else full(rates)
        score_until = CHUNK if mode == "flywire" else DURATION
        yield {"type": "ready", "neurons": circuit.neuron_count, "duration": DURATION,
               "score_until": score_until, "panel_size": len(circuit.panels[0]), "root_ids": circuit.root_ids}
        lanes = {neuron: i for i, neuron in enumerate(sum(circuit.panels, []))}
        cursor = 0
        for elapsed in range(CHUNK, DURATION+1, CHUNK):
            circuit.network.run(CHUNK*b.ms, namespace={})
            counts = np.asarray(circuit.monitor.count)
            stop = int(circuit.monitor.num_spikes)
            neurons = np.asarray(circuit.monitor.i[cursor:stop])
            times = np.asarray(circuit.monitor.t[cursor:stop]/b.ms)
            selected = np.isin(neurons, list(lanes))
            events = [[lanes[int(i)], round(float(t), 1)] for i, t in zip(neurons[selected], times[selected])]
            cursor = stop
            if elapsed <= score_until:
                score = [int(counts[p].sum()) for p in circuit.panels]
            yield {"type": "frame", "elapsed": elapsed, "counts": score,
                   "spikes": stop, "active": int(np.count_nonzero(counts)), "events": events}
    finally:
        SIMULATION_LOCK.release()
