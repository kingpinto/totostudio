# Toto Number Studio

A simple local number picker for 6/55 and 6/58. Requires Python 3.10+; no packages, build step, or accounts are needed.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` tests and builds the site on pushes to `main`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the publishing source, then run the workflow or push to `main`.

Build locally with `uv run python build_site.py`. The generated `dist/` directory contains the picker, lab, and model/report JSON. Only this directory is published. Historical data is generated at build time; Pages does not run the Python server. The site works under a repository URL such as `https://OWNER.github.io/REPOSITORY/`.

Saved selections remain browser-local and do not transfer from localhost to the published site's address. Enter your WhatsApp destination in the site’s browser-only setting. No default phone number is published. Use **Forget number** to remove the saved destination.

## Local server

```powershell
python app.py
```

Open http://127.0.0.1:6550. Stop with Ctrl+C. If an older server is already running, stop and restart it, or run `python app.py --port 6558` and open http://127.0.0.1:6558.

## Using the picker

- Switch between 6/55 and 6/58. All 58 numbers remain visible; 56–58 are disabled for 6/55. Switching to 6/55 removes selections and locks outside its range.
- Choose **Standard**, **System 7**, or **System 8** to pick 6, 7, or 8 distinct numbers. Changing size clears the editor and keeps all saved sets. Saved sets restore their size when selected, and their size is included in copied and WhatsApp messages.
- Tap the board to choose up to the selected number count, or generate a set using Feeling lucky, Model based, Low numbers, High numbers, Balanced, or Creative series.
- Tap a ball in your selection to lock it. Generating adds a completed set to your selection list and preserves locked favorites in the editor. Unlock at least one number to generate or refine.
- **Refine** changes one unlocked number according to the current style and adds the result to the list, keeping the original. Lucky and creative selections use balance for refinement. A refinement changes the shape, not the odds.
- **Challenge** questions patterns; **Support** describes validity and composition. Neither changes your numbers or predicts a win.
- Every completed manual or generated set is saved in the list. Identical sets in the same game share one entry. Select any entry to refine, challenge, or support it, or delete unwanted entries. Switching games and clearing the editor keep your saved list.
- Use **Lock in** on each set you want to share. The message preview includes only those sets; **Unlock set** removes one from the message. This is separate from locking individual favorite numbers.
- **Open WhatsApp** prepares the previewed message for the number you save in this browser using [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934). Press **Send** in WhatsApp to deliver it; the app does not automatically send or confirm delivery. No WhatsApp API credentials are configured.
- Undo the last selection, lock, deletion, or game change; copy a completed set to the clipboard. Saved sets and their lock-in status persist in this browser using local storage. The editor and undo history reset on refresh. If browser storage is unavailable, the list lasts only while the page is open.

Feeling lucky samples uniformly without replacement, conditional on locks. Low/high sample from the lower/upper half; existing locks can be outside that half. Balanced searches candidate sets for parity, range, sum, and spacing. Creative uses evenly spaced sequences, or repeating steps around locked numbers.

The 6/55 model uses the existing rank ensemble on the supplied source history; its date and draw count appear after generation. The input data is not live or independently verified. No 6/58 history is supplied, so its model is explicitly a structural pattern model. Every combination has equal odds in a fair independent draw; none of these methods establishes an advantage. The app does not place bets.

The original experimental dashboard remains at http://127.0.0.1:6550/lab.html. Its methodology and historical findings are preserved below.

## Checks

```powershell
python -m unittest discover -s tests -v
node tests/picker.cjs
node tests/ui_smoke.cjs
```

The picker tests exercise bounds, uniqueness, locks, refinement, manual selection limits, game switching, undo, reviews, model errors, saved-list actions, storage reload, and WhatsApp message contents and destination. DOM checks use a minimal simulated document and do not replace visual browser testing.

## Application files

- `app.py`: local server, historical model API, and experiment report API/export.
- `web/index.html`, `web/style.css`, `web/app.js`: responsive number picker.
- `web/picker.js`: generation and refinement algorithms.
- `web/lab.html`: original experiment dashboard.
- `engine.py`: original data validation and model experiments.

## Objective

Success means matching **all six numbers in one ticket to the corresponding target draw**, regardless of order. One through five matches do not meet the goal. Exact-match counts and rates are the primary metrics; partial-match distributions are diagnostics. The current 13 methods have **zero exact 6/6 target matches** in both frozen and walk-forward evaluation. The objective remains unmet.

## Data and evaluation

- `data/Toto655_testdata.txt`: 51 draws, June 3–September 23, 2026.
- `data/Toto655_target.txt`: 11 draws, September 1–23, 2026.
- All 11 target draws also appear in the source. The application excludes them from training, leaving 40 June–August draws. Original files are unchanged.
- The three-month training window begins on the first day of the month three months before the first target, and ends before that target. For these files, this is June 1–August 31.
- Training validation begins with 20 draws and predicts each of the remaining 20 using only preceding draws. Select by exact 6/6 matches first. Ties use total number matches, then draws with at least two matches, then original method order. No method has an exact validation match on these files; the selected method is an experimental candidate chosen by these tie breakers.
- Frozen evaluation predicts every September target from the same June–August history. Walk-forward evaluation incorporates each September draw only after predicting and scoring it. Its history expands; it is not the frozen three-month experiment.
- The separate next-draw suggestion refits the selected method on the latest three calendar months of known draws, deduplicated across files. It is for the draw after the last supplied result, not necessarily the next real-world draw.
- Seed 655 resolves tied scores and controls the balanced-ticket search. It was not searched against target results.
- Draw IDs, dates, six distinct numbers, and 1–55 bounds are validated. Dates order the observations; IDs and jackpot amounts are not prediction features. Input values are used as supplied, without independent verification of draw authenticity.

## Experiments and findings

Methods include hot and cold frequencies, two recent windows, two exponential decays, longest absence, recurrence intervals, momentum, pair co-occurrences, next-draw transitions, a rank ensemble, and a balanced ensemble that searches 800 candidate combinations.

By diagnostic mean number matches, the strongest frozen target result was the hot-number ticket **14, 26, 32, 39, 48, 52**. It matched one or more numbers on **7/11** targets, including exactly two on **3/11**, with **10 total matches (0.91 per draw)**. This is a retrospective observation; it was not used to choose the app's method.

Training-only selection chose **Longest absence** using partial-match tie breakers because all methods had zero exact validation matches, averaging **1.05** matches during training validation. Its frozen ticket **03, 09, 17, 20, 31, 49** had **7/11** targets with one match and none with two, averaging **0.64**. Walk-forward target performance was **0.55**. The stronger training result did not persist out of sample.

Refitting that selected method through September 23 produces **03, 09, 13, 14, 42, 49** for a subsequent draw. Long absence does not make a number due in a fair lottery.

For any fixed six-number ticket in a fair independent draw:

`P(K = k) = C(6,k) × C(49,6−k) / C(55,6)`

Expected matches are **36/55 ≈ 0.65**; at least one match occurs with probability **51.76%**, and at least two with **12.30%**. Exactly one or two occurs with **50.43%** probability. All six has odds of **1 in 28,989,675**.

Eleven targets and many tested methods are insufficient evidence of an edge. These experiments do not derive the target numbers reliably, and a retrospective best method can be lucky. Scores are ranking heuristics, not calibrated probabilities. Only an exact six-number combination meets the objective. Partial matches are diagnostic metrics and do not constitute success. To evaluate further, freeze the method and seed before collecting new unseen draws.

## Files

- `engine.py`: parsing, clean split, formulas, model selection, and evaluation.
- `app.py`: localhost-only web server and report export.
- `web/lab.html`: self-contained experiment dashboard without external assets.
- `results.json`: full experiment output with every predicted ticket and match.
- `tests/`: data, leakage, prediction, scoring, and dashboard rendering checks.

The automated dashboard check exercises rendering and both selection controls in a minimal DOM. It does not replace visual browser testing.
