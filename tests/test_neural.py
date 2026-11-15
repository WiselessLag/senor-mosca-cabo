import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import game, neural
from backend.api import app


class NeuralTests(unittest.TestCase):
    def test_quiet_and_driven_circuit(self):
        quiet = list(neural.simulate("demo", [0, 0, 0]))
        driven = list(neural.simulate("demo", [90, 35, 20]))
        self.assertEqual(quiet[-1]["spikes"], 0)
        self.assertEqual(driven[0]["neurons"], 21)
        self.assertEqual(driven[-1]["elapsed"], 300)
        self.assertGreater(driven[-1]["spikes"], sum(driven[-1]["counts"]))
        bins = [0, 0, 0]
        for frame in driven[1:]:
            for lane, time in frame["events"]:
                self.assertGreaterEqual(time, frame["elapsed"]-30)
                self.assertLess(time, frame["elapsed"])
                bins[lane//6] += 1
            self.assertEqual(bins, frame["counts"])
        self.assertEqual(driven[-1]["counts"], list(neural.simulate("demo", [90, 35, 20]))[-1]["counts"])

    def test_corrupt_connectome_is_rejected_before_import(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder)/"model.py").write_text("not the pinned model", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "model.py"):
                neural.verify_upstream(Path(folder))

    def test_closed_trial_releases_simulator(self):
        trial = neural.simulate("demo", [70, 60, 40])
        next(trial)
        with self.assertRaisesRegex(RuntimeError, "ocupado"):
            next(neural.simulate("demo", [70, 60, 40]))
        trial.close()
        self.assertEqual(next(neural.simulate("demo", [70, 60, 40]))["type"], "ready")


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.state = self.client.get("/api/bootstrap").json()["state"]

    def play(self, **changes):
        payload = {"state": self.state, "issue": "hotel", "focus": "neutral", "mode": "demo"}
        return self.client.post("/api/turn", json={**payload, **changes})

    def test_real_spikes_decide_different_rulings_on_same_case(self):
        trials = []
        for focus in ["neutral", "citizens"]:
            response = self.play(focus=focus)
            self.assertEqual(response.status_code, 200)
            events = [json.loads(line) for line in response.text.splitlines()]
            self.assertEqual([e["type"] for e in events[:2]], ["stimulus", "ready"])
            self.assertEqual(sum(e["type"] == "result" for e in events), 1)
            spike_counts = events[-2]["counts"]
            self.assertEqual(events[-1]["winner"], game.decode(spike_counts))
            self.assertEqual(events[-1]["state"]["day"], 2)
            trials.append(events[-1]["ruling"]["title"])
        self.assertEqual(trials, ["Permiso preferente", "Salvar el acceso público"])

    def test_missing_full_files_never_silently_use_demo(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"MOSCA_SHIU_DIR": folder}):
            self.assertFalse(self.client.get("/api/bootstrap").json()["flywire"]["available"])
            response = self.play(mode="flywire")
            self.assertEqual(response.status_code, 503)
            self.assertIn("Connectivity_783.parquet", response.json()["detail"])

    def test_invalid_and_finished_turns_are_rejected(self):
        self.assertEqual(self.play(issue="nonexistent").status_code, 422)
        self.assertEqual(self.play(state={**self.state, "day": 11}).status_code, 409)
