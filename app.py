"""Run: python app.py. Export: python app.py --report results.json"""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from engine import build_report, read_draws, predict

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/model":
            try:
                history = read_draws(ROOT / "data/Toto655_testdata.txt")
                data = json.dumps({"ticket": predict(history, "ensemble"), "after": history[-1].date.isoformat(), "draws": len(history)}).encode()
                self.send_response(200)
            except (ValueError, OSError) as exc:
                data = json.dumps({"error": str(exc)}).encode()
                self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path == "/api/report":
            try:
                data = json.dumps(build_report(ROOT / "data/Toto655_testdata.txt", ROOT / "data/Toto655_target.txt")).encode()
                self.send_response(200)
            except (ValueError, OSError) as exc:
                data = json.dumps({"error": str(exc)}).encode()
                self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=6550)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.report:
        report = build_report(ROOT / "data/Toto655_testdata.txt", ROOT / "data/Toto655_target.txt")
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Saved {args.report.resolve()}")
        return
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT / "web")))
    print(f"Toto Number Studio: http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
