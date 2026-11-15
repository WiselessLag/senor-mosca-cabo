import unittest
from dataclasses import replace

from backend import game


class GameTests(unittest.TestCase):
    def test_readout_changes_same_docket_consequences(self):
        start = game.State()
        water = game.ISSUES["water"]
        public = game.resolve(start, water, [20, 8, 6])
        market = game.resolve(start, water, [8, 20, 6])
        self.assertEqual(public["ruling"]["title"], "Pipas para las colonias")
        self.assertEqual(market["ruling"]["title"], "Pipas con patrocinador")
        self.assertLess(public["state"]["treasury"], market["state"]["treasury"])
        self.assertGreater(public["state"]["satisfaction"], market["state"]["satisfaction"])
        self.assertEqual(start.day, 1)

    def test_tie_or_silence_defers_instead_of_electing_a_winner(self):
        for counts in ([0, 0, 0], [4, 4, 3]):
            with self.subTest(counts=counts):
                outcome = game.resolve(game.State(), game.ISSUES["audit"], counts)
                self.assertIsNone(outcome["winner"])
                self.assertEqual(outcome["ruling"]["title"], "Sin resolución")
                self.assertEqual(outcome["changes"]["satisfaction"], -5)

    def test_bounds_and_campaign_end(self):
        start = replace(game.State(), day=10, treasury=100, satisfaction=99, corruption=1)
        after = game.resolve(start, game.ISSUES["water"], [7, 0, 2])
        self.assertEqual(after["state"]["treasury"], 0)
        self.assertEqual(after["state"]["corruption"], 0)
        self.assertEqual(after["state"]["satisfaction"], 100)
        self.assertIn("Tesorería intervenida", after["ending"])
        self.assertIn("Mandato renovado", game.ending(replace(game.State(), day=11)))

    def test_encoder_responds_to_brief_and_city(self):
        hotel = game.ISSUES["hotel"]
        baseline = game.encode(hotel, game.State(), "neutral")
        pressure = game.encode(hotel, replace(game.State(), audit=85), "audit")
        self.assertEqual(baseline[:2], pressure[:2])
        self.assertGreater(pressure[2], baseline[2])
