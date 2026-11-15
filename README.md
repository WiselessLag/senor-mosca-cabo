# Señor Mosca: Cabo Corruption Simulator

A local, Spanish-language city-management game set in **Bahía Mosca**, a fictional town inspired by Los Cabos. Present a brief on water, contracts, hotel permits, an audit, or a protest. Emphasize a concern and watch Brian2 spikes determine the mayor’s ruling. The press briefing records the fallout. Keep the town solvent and its residents onside for ten days.

### Run locally

Use Python 3.12, Node.js 22+ and npm. From this directory, in PowerShell:

```powershell
uv venv --python 3.12
uv pip install -r requirements.txt
npm ci
npm run build
.venv/Scripts/python -m uvicorn backend.api:app --host 127.0.0.1 --port 8765
```

Open **http://127.0.0.1:8765**. The demo needs no connectome download or compiler. On macOS/Linux use `.venv/bin/python`; standard `python3.12 -m venv .venv` and pip inside the virtual environment also work. For frontend development, leave the API running and use `npm run dev` for Vite on port 5173. The campaign stays in the browser tab's session storage and can be reset at the bottom of the page.

Open **http://127.0.0.1:8765/3d/** for the automatic 3D hearing. The mayor stays seated while the clerk presents the five cases in order, then repeats the agenda until the mandate ends. The hearing starts on its own and uses FlyWire v783 if the files and dependencies are installed. Add `?modo=demo` for the faster circuit, or change the circuit before the next trial. Pause holds the next case while an in-flight trial can finish. The 3D view requires WebGL 2. The text, rulings and neural plot are available without it.

The 3D edition was inspired by experiments with fly connectomes. Both editions here use the same Shiu backend and its FlyWire v783 tables. [MaleCNS](https://male-cns.janelia.org/) is a separate connectome release that covers the male fly's brain and ventral nerve cord.

For **FlyWire v783**, follow the [data setup and validation guide](docs/FLYWIRE.md). It requires about 104 MB of pinned upstream tables and takes tens of seconds per turn on the tested Windows machine.

### How decisions are made

1. The fictional brief, city metrics and selected emphasis generate three rates in the range 12–125 Hz. Channel names describe the game inputs.
2. Deterministic pulses drive three input neurons in Brian2. The demo uses a synthetic 21-neuron circuit. FlyWire uses Shiu’s upstream equations and the directed, weighted v783 table.
3. The three panels each contain six **downstream** neurons. The highest spike count wins. A tie or silence defers the case. The demo scores all 300 ms. FlyWire scores the first 30 ms and shows all 300 ms.
4. The game applies the chosen ruling's fictional consequences. No language model or random picker chooses the ruling. Press quotes are written game content.

The React client shows each streamed 30 ms slice as it finishes, with a raster for the 18 observed neurons and aggregate statistics for the complete circuit. `backend/neural.py` simulates and measures, `backend/game.py` encodes briefs and resolves rulings, and `backend/api.py` joins them via an NDJSON stream. The local API accepts the current city state from the client.

### Verify

```powershell
uv pip install -r requirements-test.txt
.venv/Scripts/python -m unittest discover -s tests -v
npx playwright install chromium
npm run test:e2e
```

Set `$env:MOSCA_TEST_FULL = '1'` before the browser test to include real v783 trials in both editions. For a standalone demo trial use `.venv/Scripts/python -m backend.smoke`.

Bahía Mosca and all characters, cases and speeches are fictional. Neither the demo nor the full circuit demonstrates cognition, corrupt intent or political behavior.
