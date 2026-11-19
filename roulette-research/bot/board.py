"""ვირტუალური დაფა: ლოკალური ვებ-გვერდი, რომელიც observer.py-ს მდგომარეობას ცოცხლად აჩვენებს.

  python board.py                 # → http://localhost:8765 (ბრაუზერი თავად გაიხსნება)
  python board.py --dir C:\\data   # თუ spins.csv / state.json სხვა საქაღალდეშია
"""
import argparse
import http.server
import os
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".", help="საქაღალდე, სადაც state.json იწერება (spins.csv-ის გვერდით)")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    data_dir = os.path.abspath(a.dir)

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            path = self.path.split("?")[0]
            if path in ("/", "/index.html"):
                f, ctype = os.path.join(HERE, "board.html"), "text/html; charset=utf-8"
            elif path == "/state.json":
                f, ctype = os.path.join(data_dir, "state.json"), "application/json; charset=utf-8"
            else:
                self.send_error(404)
                return
            if not os.path.exists(f):
                self.send_error(404, "state.json ჯერ არ არსებობს — გაუშვი observer.py")
                return
            with open(f, "rb") as fh:
                body = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), H)
    url = f"http://localhost:{a.port}"
    print(f"ვირტუალური დაფა: {url}  (Ctrl+C — გაჩერება)")
    webbrowser.open(url)
    srv.serve_forever()


if __name__ == "__main__":
    main()
