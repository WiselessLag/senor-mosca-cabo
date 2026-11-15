# FlyWire v783: setup, protocol and roadmap

[Shiu et al., Nature (2024), DOI 10.1038/s41586-024-07763-9](https://doi.org/10.1038/s41586-024-07763-9) used FlyWire **v630** in their paper. The [upstream repository](https://github.com/philshiu/Drosophila_brain_model/tree/91bdd1e7dcf193f3e7ca5a8933497fcef63b7960) documents the v783 substitutions and ships prepared tables. [Dorkenwald et al., Nature (2024), DOI 10.1038/s41586-024-07558-y](https://doi.org/10.1038/s41586-024-07558-y) describe the connectome. Credit to the FlyWire Consortium, the Princeton FlyWire team, and the Murthy and Seung labs.

Upstream code is MIT licensed (Philip Shiu and Nico Spiller). Its environment specifies Python 3.10, Brian2 2.5.1, NumPy 1.24, pandas, PyArrow and joblib, plus notebook tools. This game was tested with **Python 3.12 and Brian2 2.9.0**, using NumPy code generation, which requires no compiler.

Shiu's v783 CSV has **138,639 neuron rows**. The parquet has **15,091,983 weighted directed connection rows**. A row describes a connection, which can aggregate multiple anatomical synapses. The model loads all neurons and connection rows in those tables. The wider anatomical release and the model's input table have different counts. The adapter looks up root IDs by CSV row position and keeps them as strings in the browser to preserve precision. The model reads presynaptic and postsynaptic index columns and weights edges using the signed `Excitatory x Connectivity` column.

### Fetch the model and v783 tables

From the project directory:

```powershell
git clone --filter=blob:none --no-checkout https://github.com/philshiu/Drosophila_brain_model.git upstream
git -C upstream sparse-checkout set --no-cone /model.py /utils.py /Readme.md /LICENSE /environment.yml /environment_full.yml /Completeness_783.csv /Connectivity_783.parquet
git -C upstream checkout --detach 91bdd1e7dcf193f3e7ca5a8933497fcef63b7960
uv pip install -r requirements-flywire.txt
.venv/Scripts/python -m backend.smoke --mode flywire
```

If the pinned checkout already exists, skip the Git commands. For a different path, set `$env:MOSCA_SHIU_DIR = 'C:/path/to/checkout'` before starting the process. The adapter checks files and dependencies, then checks their pinned Git blob IDs before importing the upstream code. The parquet is about 100.8 MB and the CSV 3.3 MB before checkout line ending conversion. No microscopy volumes, reconstructions or archived outputs are needed. Allow several GB of free memory; the tested Windows machine had about 24 GiB installed and a minimum has not been benchmarked. Full mode errors leave the turn uncommitted. You can switch to demo explicitly.

After the smoke test, start the game from the [README](../README.md) and select **FlyWire v783**. The data files remain untracked and are not bundled. [FlyWire's release and citation guidelines](https://join.flywire.ai/guidelines) describe its public data as CC BY-NC 4.0.

### Experiment implemented here

Upstream `run_exp` calls `run_trial`, which builds the circuit with `create_model`, adds Poisson input via `poi` and advances a Brian2 network with a spike monitor. This adapter calls upstream **`create_model`**, retaining its LIF equations, thresholds, resets, refractory period, delays and synaptic weights. It runs one fresh 300 ms trial with a 0.1 ms step. The game replaces random Poisson input with regular pulses through a `SpikeGeneratorGroup`. As upstream does for its stimulation, it disables the refractory delay on the three driven cells and adds `w_syn * f_poi` to their membrane voltage. This adapter does not silence neurons.

The inputs are engineering **probes**, with no claimed sensory cell type. `python -m backend.probe upstream` reproduces the selection of three distinct sources with six disjoint strongly excitatory direct targets each (signed weights 160–230). The first pulse is at `5 + 1.1 * channel + 0.9 * (max_rate - rate)` ms, followed by a period of `1000 / rate` ms. The score uses only the spikes from the six downstream targets per panel during the first 30 ms. The raster displays later spikes too. The window and onset are engineering choices: with simultaneous stimulation, sustained activity favored one panel in the initial pilot. Similar rates, cross-talk and differences in panel sensitivity can reverse the order of inputs. No panel has a validated relationship to a political issue.

### Roadmap

- Compare the fixed-input spike counts and timing when upgrading dependencies or changing the stimulus or score. Run the optional full browser test.
- Run longer no-input trials, single-probe pulses and a fixed matrix of rates and latencies. Quantify saturation, panel bias, ties, and how much the direct connections alone explain. The political interpretation is a game mechanic.
- For paper reproduction, separately run upstream’s v630 examples with the original Poisson protocol and environment, then use validated v783 root IDs for a version comparison. This game trial is not a paper replication.
- Profile memory and runtime before trying Brian2 Cython or C++ acceleration. Compare against the NumPy event timings and scores before changing the default. The local backend runs one experiment at a time.
