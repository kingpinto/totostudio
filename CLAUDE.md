# CLAUDE.md

Toto Number Studio: a dependency-free 6/55 and 6/58 lottery number picker (vanilla JS front end) plus a Python experiment engine that evaluates historical-pattern methods on supplied 6/55 draws. `README.md` is the user-facing spec and records the experiment findings; keep it in sync when behavior changes.

## Commands

Python is managed with `uv` (see `.github/instructions/python-uv.instructions.md`): run Python via `uv run`, never bare `python` or `pip`. There are no runtime dependencies; Node 22 is used only for JS tests.

```powershell
uv run python app.py                 # local server at http://127.0.0.1:6550 (--port N to change)
uv run python app.py --report results.json   # regenerate results.json
uv run python refine.py              # regenerate refinement.json
uv run python build_site.py          # build static site into dist/

uv run python -m unittest discover -s tests -v   # engine tests
uv run python -m unittest tests.test_engine.EngineTests.<name>   # single test
node tests/picker.cjs                # picker logic + simulated-DOM app tests
node tests/ui_smoke.cjs              # lab.html dashboard rendering check
```

CI (`.github/workflows/pages.yml`) runs all three test suites, then `build_site.py`, and deploys `dist/` to GitHub Pages on push to `main`.

## Architecture

- `engine.py` — parses/validates draw CSVs (`read_draws`), splits training vs. targets (`split_data`, excluding target draws from training; three-calendar-month window), defines scoring methods in `METHODS`, and `predict`/`evaluate`/`build_report`. Seed 655 is fixed by default.
- `app.py` — stdlib `ThreadingHTTPServer` bound to 127.0.0.1, serving `web/` statically plus two JSON endpoints: `/api/model` (ensemble ticket from the full history) and `/api/report` (full experiment report).
- `build_site.py` — copies `web/` files to `dist/`, pre-computes `model.json` and `report.json`, and **rewrites the literal strings** `'/api/model'`, `'/api/report'` and `href="/"` to relative paths. Keep those exact literals (same quote style) in `web/app.js`, `web/lab.html`, and `web/index.html` or the Pages build breaks silently. Any new `web/` file must be added to the copy list. When `VERCEL` is set (Vercel builds), it also injects the Vercel Web Analytics snippet before `</head>` in the HTML pages; local and GitHub Pages builds omit it.
- `refine.py` — standalone exploratory three-ticket portfolio experiment (seed 20261002); writes `refinement.json`.
- `web/picker.js` — pure generation and Refine logic (`generate`, `stats`, `suggestions`, `sumPercentile`, `comb`, ...) in a UMD-style wrapper so it runs both in the browser (`Picker` global) and under Node `require`. Uses `crypto.getRandomValues` with rejection sampling. 4D tickets use separate digit functions (`generateDigits`, `digitSuggestions`, `digitStats`, `permutations`, `distinctPair`): a ticket is an array of 4 digits (4D) or 8 digits (4D Jackpot pair, halves must differ), and locks are positions, not values.
- `web/app.js` — picker UI state (game 55/58 via `max`, or `digitGame` `'4d'`/`'4dj'`, which is `null` for lotto games; set size 6/7/8, locks, saved entries, Refine insights, undo, WhatsApp message). Sets are saved only through **Add to list**; the active saved row is derived by matching the editor (`currentEntry()`), not stored. Refine (`refineSet`) never changes numbers itself; its suggestions are applied with **Use this**. Persists to `localStorage` keys `toto-selections` and `toto-whatsapp`, always inside try/catch.
- `web/lab.html` — self-contained experiment dashboard (no external assets).
- `data/` — supplied source (`Toto655_testdata.txt`) and target (`Toto655_target.txt`) draws; CSV with header `DrawNo,DrawDate(YYYYMMDD),DrawnNo1..6,Jackpot`. Treat as read-only inputs.
- `results.json`, `refinement.json` — committed generated outputs; regenerate rather than hand-edit.

## Conventions

- Front-end JS is deliberately compact/minified-style (long single lines, terse names, no framework, no build step). Match that style when editing `web/*.js` and `tests/*.cjs`.
- `tests/picker.cjs` loads `web/app.js` in a `vm` context with a fake `document` built from the `id="..."` attributes in `web/index.html`; every element `app.js` looks up must exist in `index.html` or the test fails. The later reload checks rebind the shared fake DOM handlers to a new context, so add app-flow assertions before them.
- Honesty constraints are part of the product: UI and docs must not claim any method predicts draws or improves odds. Success is defined only as an exact 6/6 match; partial matches are diagnostics. Avoid tuning seeds or weights against target results (avoid target leakage, which tests check).
- No phone number or credentials are ever hard-coded; the WhatsApp destination is browser-local only.
