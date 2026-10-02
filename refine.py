"""Reproducible three-ticket refinement; run with python refine.py.

Weights and seed are fixed before evaluation, not searched against targets.
The targets were previously inspected, so this remains exploratory evaluation.
"""
import calendar
import json
import math
import random
from pathlib import Path

from engine import read_draws, scores_for, split_data

ROOT = Path(__file__).resolve().parent
SEED = 20261002


def tickets(history, seed=SEED):
    hot = scores_for(history, 'frequency')
    recent = scores_for(history, 'decay_12')
    # Both component scores sum to six. The uniform component deliberately
    # shrinks noisy historical preferences. These are sampling weights,
    # not estimated probabilities of appearing in the next draw.
    weights = {n: .50 / 55 + .30 * hot[n] / 6 + .20 * recent[n] / 6
               for n in range(1, 56)}
    rng = random.Random(seed)
    tie = {n: rng.random() for n in weights}
    anchor = sorted(sorted(weights, key=lambda n: (weights[n], tie[n]), reverse=True)[:6])
    output = [anchor]
    available = set(weights) - set(anchor)
    for _ in range(2):
        # Exponential-race weighted sampling without replacement.
        keys = {n: -math.log(max(rng.random(), 1e-15)) / weights[n]
                for n in sorted(available)}
        ticket = sorted(sorted(keys, key=keys.get)[:6])
        output.append(ticket)
        available.difference_update(ticket)
    return output


def evaluate_portfolios(history, targets, seeds, rolling):
    exact = total_tickets = 0
    histogram = [0] * 7
    for seed in seeds:
        past = list(history)
        for target in targets:
            portfolio = tickets(past, seed)
            for ticket in portfolio:
                hits = len(set(ticket) & set(target.numbers))
                histogram[hits] += 1
                exact += hits == 6
                total_tickets += 1
            if rolling:
                past.append(target)
    return {'exact_matches': exact, 'ticket_evaluations': total_tickets,
            'match_histogram': histogram,
            'note': 'Repeated seeds share the same draws and anchor; these are not independent trials.'}


def main():
    source = read_draws(ROOT / 'data/Toto655_testdata.txt')
    targets = read_draws(ROOT / 'data/Toto655_target.txt')
    training = split_data(source, targets)
    known = sorted({d.id: d for d in source + targets}.values(), key=lambda d: d.date)
    last = known[-1].date
    index = last.year * 12 + last.month - 1 - 3
    start = last.replace(year=index // 12, month=index % 12 + 1,
                         day=min(last.day, calendar.monthrange(index // 12, index % 12 + 1)[1]))
    history = [d for d in known if d.date > start]
    refined = tickets(history)
    assert refined == tickets(history)
    assert len(set(n for t in refined for n in t)) == 18
    assert all(len(t) == 6 and all(1 <= n <= 55 for n in t) for t in refined)
    seeds = range(SEED, SEED + 100)
    report = {
        'data_through': last.isoformat(), 'history_count': len(history),
        'seed': SEED, 'seed_choice': 'Client date 2026-10-02, not optimized',
        'formula': 'w(n) = 0.50/55 + 0.30*frequency(n)/6 + 0.20*decay12(n)/6',
        'tickets': refined,
        'selection': 'Top six weights, then two weighted random tickets excluding previously selected numbers',
        'exact_match_probability_per_ticket_if_fair': 1 / math.comb(55, 6),
        'exact_match_probability_three_distinct_tickets_if_fair': 3 / math.comb(55, 6),
        'interpretation': 'Disjoint tickets increase number coverage, not exact-match odds versus any other three distinct tickets.',
        'checks': {
            'training_validation': evaluate_portfolios(training[:20], training[20:], [SEED], True),
            'frozen_targets': evaluate_portfolios(training, targets, [SEED], False),
            'rolling_targets': evaluate_portfolios(training, targets, [SEED], True),
            'randomness_sensitivity_100_seeds': evaluate_portfolios(training, targets, seeds, True),
        },
    }
    (ROOT / 'refinement.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
