"""Deterministic lottery experiments. No external dependencies."""
import calendar
import csv
import math
import random
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class Draw:
    id: str
    date: object
    numbers: tuple


def read_draws(path):
    draws = []
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, skipinitialspace=True)
        required = {"DrawNo", "DrawDate", *(f"DrawnNo{i}" for i in range(1, 7))}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"{path}: missing required columns")
        for line, row in enumerate(reader, 2):
            try:
                numbers = tuple(sorted(int(row[f"DrawnNo{i}"]) for i in range(1, 7)))
                date = datetime.strptime(row["DrawDate"], "%Y%m%d").date()
                if len(set(numbers)) != 6 or not all(1 <= n <= 55 for n in numbers):
                    raise ValueError("need six distinct numbers from 1 to 55")
                draws.append(Draw(row["DrawNo"], date, numbers))
            except (ValueError, TypeError) as exc:
                raise ValueError(f"{path}, row {line}: {exc}") from exc
    if not draws:
        raise ValueError(f"{path}: no draws")
    if len({d.id for d in draws}) != len(draws) or len({d.date for d in draws}) != len(draws):
        raise ValueError(f"{path}: duplicate draw ID or date")
    return sorted(draws, key=lambda d: d.date)


def month_start_before(date, months=3):
    index = date.year * 12 + date.month - 1 - months
    return date.replace(year=index // 12, month=index % 12 + 1, day=1)


def split_data(source, targets):
    cutoff = targets[0].date
    start = month_start_before(cutoff)
    target_ids = {d.id for d in targets}
    training = [d for d in source if start <= d.date < cutoff and d.id not in target_ids]
    if len(training) < 20:
        raise ValueError("Need at least 20 earlier draws in the three-month training window")
    for d in source:
        for t in targets:
            if (d.id == t.id or d.date == t.date) and d != t:
                raise ValueError("Conflicting source/target draw records")
    return training


METHODS = {
    "frequency": ("Hot numbers", "s(n) = count(n) / T"),
    "cold": ("Cold numbers", "s(n) = -count(n) / T"),
    "recent_5": ("Recent 5", "s(n) = count in last 5 draws / 5"),
    "recent_10": ("Recent 10", "s(n) = count in last 10 draws / 10"),
    "decay_5": ("Decay · 5 draws", "s(n) = Σ 2^(-age/5) I(n in draw) / Σ weights"),
    "decay_12": ("Decay · 12 draws", "s(n) = Σ 2^(-age/12) I(n in draw) / Σ weights"),
    "gap": ("Longest absence", "s(n) = draws since last appearance"),
    "cycle": ("Gap recurrence", "s(n) = -|(draws absent + 1) - mean historical gap| / (mean gap + 1)"),
    "momentum": ("Momentum", "s(n) = recent-10 frequency - earlier frequency"),
    "pairs": ("Pair associations", "s(n) = Σ over last-draw m: (co-occurrences(n,m)+1)/(count(m)+2)"),
    "transition": ("Next-draw associations", "s(n) = Σ over last-draw m: (next-draw count(m→n)+1)/(prior count(m)+2)"),
    "ensemble": ("Rank ensemble", "s(n) = mean normalized ranks of hot, decay-12, recurrence, pairs, transitions"),
    "balanced": ("Balanced ensemble", "maximize Σ ensemble scores - 0.10|odd count-3| - 0.002|sum-168|"),
}


def rank_scores(scores):
    # Midranks preserve ties instead of assigning arbitrary numerical preference.
    return {n: (sum(v < s for v in scores.values()) + .5 * sum(v == s for v in scores.values())) / 55
            for n, s in scores.items()}


def scores_for(history, method):
    count = Counter(n for d in history for n in d.numbers)
    size = len(history)
    if not size:
        raise ValueError("Prediction requires history")
    if method in ("ensemble", "balanced"):
        components = [rank_scores(scores_for(history, m)) for m in
                      ("frequency", "decay_12", "cycle", "pairs", "transition")]
        return {n: sum(s[n] for s in components) / len(components) for n in range(1, 56)}
    result = {}
    for n in range(1, 56):
        positions = [i for i, d in enumerate(history) if n in d.numbers]
        gap = size - 1 - positions[-1] if positions else size
        if method == "frequency":
            score = count[n] / size
        elif method == "cold":
            score = -count[n] / size
        elif method.startswith("recent_"):
            window = history[-int(method.split("_")[1]):]
            score = sum(n in d.numbers for d in window) / len(window)
        elif method.startswith("decay_"):
            half = int(method.split("_")[1])
            weights = [2 ** (-(size - 1 - i) / half) for i in range(size)]
            score = sum(w for w, d in zip(weights, history) if n in d.numbers) / sum(weights)
        elif method == "gap":
            score = gap
        elif method == "cycle":
            intervals = [b - a for a, b in zip(positions, positions[1:])]
            mean = sum(intervals) / len(intervals) if intervals else 55 / 6
            score = -abs(gap + 1 - mean) / (mean + 1)
        elif method == "momentum":
            recent, older = history[-10:], history[:-10]
            score = sum(n in d.numbers for d in recent) / len(recent) - sum(n in d.numbers for d in older) / max(1, len(older))
        elif method == "pairs":
            score = sum((sum(n in d.numbers and m in d.numbers for d in history) + 1) / (count[m] + 2)
                        for m in history[-1].numbers if m != n)
        elif method == "transition":
            score = sum((sum(m in a.numbers and n in b.numbers for a, b in zip(history, history[1:])) + 1) /
                        (sum(m in d.numbers for d in history[:-1]) + 2) for m in history[-1].numbers)
        else:
            raise ValueError(f"Unknown method: {method}")
        result[n] = score
    return result


def predict(history, method, seed=655):
    scores = scores_for(history, method)
    rng = random.Random(seed)
    tie = {n: rng.random() for n in range(1, 56)}
    ranked = sorted(scores, key=lambda n: (scores[n], tie[n]), reverse=True)
    if method != "balanced":
        return sorted(ranked[:6])
    # A fixed, reproducible search; it never examines a target draw.
    candidates = [ranked[:6]] + [rng.sample(ranked[:24], 6) for _ in range(800)]
    def quality(ticket):
        return sum(scores[n] for n in ticket) - .10 * abs(sum(n % 2 for n in ticket) - 3) - .002 * abs(sum(ticket) - 168)
    return sorted(max(candidates, key=quality))


def evaluate(history, targets, method, rolling=False, seed=655):
    past = list(history)
    rows = []
    for target in targets:
        ticket = predict(past, method, seed)
        hits = sorted(set(ticket) & set(target.numbers))
        rows.append({"date": target.date.isoformat(), "prediction": ticket,
                     "target": list(target.numbers), "hits": hits, "matches": len(hits),
                     "exact_match": set(ticket) == set(target.numbers)})
        if rolling:
            past.append(target)  # Only after this draw has been scored.
    histogram = [sum(r["matches"] == k for r in rows) for k in range(7)]
    return {"exact_matches": sum(r["exact_match"] for r in rows),
            "exact_match_rate": sum(r["exact_match"] for r in rows) / len(rows),
            "match_histogram": histogram, "best_match": max(r["matches"] for r in rows),
            "total": sum(r["matches"] for r in rows),
            "average": sum(r["matches"] for r in rows) / len(rows),
            "at_least_one": sum(r["matches"] >= 1 for r in rows),
            "at_least_two": sum(r["matches"] >= 2 for r in rows), "rows": rows}


def selection_key(result):
    # Exact combinations outrank any quantity of partial matches.
    # Partial-match tie breakers choose a candidate, not a successful model.
    return result["exact_matches"], result["total"], result["at_least_two"]


def build_report(source_path, target_path, seed=655):
    source, targets = read_draws(source_path), read_draws(target_path)
    training = split_data(source, targets)
    # Expanding-window model selection using ONLY the three-month training set.
    validation = {m: evaluate(training[:20], training[20:], m, True, seed) for m in METHODS}
    selected = max(METHODS, key=lambda m: selection_key(validation[m]))
    experiments = []
    for m, (label, formula) in METHODS.items():
        experiments.append({"id": m, "name": label, "formula": formula,
                            "validation": validation[m],
                            "fixed": evaluate(training, targets, m, False, seed),
                            "rolling": evaluate(training, targets, m, True, seed),
                            "ticket": predict(training, m, seed)})
    probabilities = [math.comb(6, k) * math.comb(49, 6-k) / math.comb(55, 6) for k in range(7)]
    counts = Counter(n for d in training for n in d.numbers)
    # Use every observed draw once for a separate, forward-looking suggestion.
    known = {d.id: d for d in source}
    known.update({d.id: d for d in targets})
    known = sorted(known.values(), key=lambda d: d.date)
    last = known[-1].date
    month_index = last.year * 12 + last.month - 1 - 3
    rolling_start = last.replace(year=month_index // 12, month=month_index % 12 + 1,
                               day=min(last.day, calendar.monthrange(month_index // 12, month_index % 12 + 1)[1]))
    recent = [d for d in known if d.date > rolling_start]
    return {"objective": "Match all six numbers of the corresponding target draw, regardless of order",
            "selection_rule": "Exact validation matches first; total partial matches and 2+ counts break ties, then method order",
            "validation_has_exact_match": any(v["exact_matches"] for v in validation.values()),
            "seed": seed, "selected": selected, "experiments": experiments,
            "data": {"source_count": len(source), "training_count": len(training), "target_count": len(targets),
                     "overlap_count": sum(d.id in {t.id for t in targets} for d in source),
                     "excluded_count": len(source) - len(training),
                     "training_start": training[0].date.isoformat(), "training_end": training[-1].date.isoformat(),
                     "target_start": targets[0].date.isoformat(), "target_end": targets[-1].date.isoformat(),
                     "validation_count": len(training)-20},
            "baseline": {"expected_matches": 36/55, "probabilities": probabilities,
                         "at_least_one": 1-probabilities[0], "at_least_two": 1-sum(probabilities[:2]),
                         "exactly_one_or_two": sum(probabilities[1:3]), "jackpot_odds": math.comb(55, 6)},
            "frequencies": [{"number": n, "count": counts[n]} for n in range(1, 56)],
            "next": {"after": last.isoformat(), "history_count": len(recent),
                     "history_start": recent[0].date.isoformat(), "ticket": predict(recent, selected, seed)}}
