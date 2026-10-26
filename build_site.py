"""Build a standalone GitHub Pages site from the supplied historical data."""
import json
import os
from pathlib import Path

from engine import build_report, predict, read_draws

# Vercel Web Analytics (cookie-free unique visitor counts); /_vercel/insights only exists on Vercel deployments.
VERCEL_ANALYTICS = (
    "<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n"
    '<script defer src="/_vercel/insights/script.js"></script>\n'
)


def build(analytics=None):
    root = Path(__file__).resolve().parent
    output = root / "dist"
    output.mkdir(exist_ok=True)
    if analytics is None:
        analytics = bool(os.environ.get("VERCEL"))
    for name in ("index.html", "lab.html", "app.js", "picker.js", "style.css"):
        content = (root / "web" / name).read_text(encoding="utf-8")
        content = content.replace("'/api/model'", "'model.json'")
        content = content.replace("'/api/report'", "'report.json'")
        content = content.replace('href="/"', 'href="./"')
        if analytics and name.endswith(".html"):
            content = content.replace("</head>", VERCEL_ANALYTICS + "</head>", 1)
        (output / name).write_text(content, encoding="utf-8")
    history = read_draws(root / "data/Toto655_testdata.txt")
    model = {"ticket": predict(history, "ensemble"), "after": history[-1].date.isoformat(), "draws": len(history)}
    report = build_report(root / "data/Toto655_testdata.txt", root / "data/Toto655_target.txt")
    for name, data in (("model.json", model), ("report.json", report)):
        (output / name).write_text(json.dumps(data), encoding="utf-8")
    (output / ".nojekyll").touch()
    print(f"Built static site: {output}")


if __name__ == "__main__":
    build()
