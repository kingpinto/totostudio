import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch
import engine

ROOT = Path(__file__).resolve().parents[1]


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = engine.read_draws(ROOT / 'data/Toto655_testdata.txt')
        cls.targets = engine.read_draws(ROOT / 'data/Toto655_target.txt')
        cls.history = engine.split_data(cls.source, cls.targets)

    def test_overlap_is_excluded(self):
        self.assertEqual(len(self.history), 40)
        self.assertEqual(len(self.targets), 11)
        self.assertFalse({d.id for d in self.history} & {d.id for d in self.targets})
        self.assertLess(max(d.date for d in self.history), min(d.date for d in self.targets))

    def test_predictions_are_valid_and_repeatable(self):
        for method in engine.METHODS:
            ticket = engine.predict(self.history, method)
            self.assertEqual(ticket, engine.predict(self.history, method))
            self.assertEqual(len(set(ticket)), 6)
            self.assertTrue(all(1 <= n <= 55 for n in ticket))

    def test_evaluation_never_sees_current_or_future_targets(self):
        actual = engine.predict
        for rolling in (False, True):
            observed = []
            def spy(history, method, seed):
                observed.append(list(history))
                return actual(history, method, seed)
            with patch('engine.predict', side_effect=spy):
                engine.evaluate(self.history, self.targets, 'frequency', rolling)
            for index, history in enumerate(observed):
                self.assertEqual(history, self.history + (self.targets[:index] if rolling else []))

    def test_hit_count_ignores_order(self):
        target = engine.Draw('test', date(2026, 9, 1), (1, 2, 3, 4, 5, 6))
        with patch('engine.predict', return_value=[9, 8, 7, 6, 5, 4]):
            result = engine.evaluate(self.history, [target], 'frequency')
        self.assertEqual(result['rows'][0]['hits'], [4, 5, 6])
        self.assertEqual(result['total'], 3)

    def test_bad_data_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'bad.csv'
            for numbers in ('1,1,2,3,4,5', '0,1,2,3,4,5', '1,2,3,4,5,56'):
                file.write_text('DrawNo,DrawDate,DrawnNo1,DrawnNo2,DrawnNo3,DrawnNo4,DrawnNo5,DrawnNo6\n1,20260601,'+numbers)
                with self.assertRaises(ValueError):
                    engine.read_draws(file)

    def test_only_all_six_count_as_success_regardless_of_order(self):
        target = engine.Draw('test', date(2026, 9, 1), (1, 2, 3, 4, 5, 6))
        for k in range(7):
            ticket = list(range(1, k + 1)) + list(range(10, 16 - k))
            with patch('engine.predict', return_value=list(reversed(ticket))):
                result = engine.evaluate(self.history, [target], 'frequency')
            self.assertEqual(result['exact_matches'], int(k == 6))
            self.assertEqual(result['exact_match_rate'], float(k == 6))
            self.assertEqual(result['rows'][0]['exact_match'], k == 6)
            self.assertEqual(result['match_histogram'][k], 1)
            self.assertEqual(result['best_match'], k)

    def test_exact_match_outranks_many_partial_matches(self):
        exact = {'exact_matches': 1, 'total': 6, 'at_least_two': 1}
        partial = {'exact_matches': 0, 'total': 100, 'at_least_two': 20}
        self.assertGreater(engine.selection_key(exact), engine.selection_key(partial))


if __name__ == '__main__':
    unittest.main()
