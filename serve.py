#!/usr/bin/env python3
"""Serve the docs directory on the local network with automatic browser reloads."""

from __future__ import annotations

import argparse
import io
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_ROOT = PROJECT_DIR / "docs"
RELOAD_ENDPOINT = "/__livereload_version"
RELOAD_SCRIPT = b"""
<script>
(() => {
  let version;
  const check = async () => {
    try {
      const response = await fetch('/__livereload_version', { cache: 'no-store' });
      const nextVersion = await response.text();
      if (version !== undefined && nextVersion !== version) location.reload();
      version = nextVersion;
    } catch (_) {
      // The server may be restarting; the next poll will try again.
    }
  };
  check();
  setInterval(check, 750);
})();
</script>
"""


class ChangeTracker:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.version = time.time_ns()
        self._snapshot = self._scan()
        self._lock = threading.Lock()

    def _scan(self) -> dict[str, tuple[int, int]]:
        snapshot: dict[str, tuple[int, int]] = {}
        for path in self.root.rglob("*"):
            if not path.is_file():
                continue
            try:
                stat = path.stat()
            except FileNotFoundError:
                continue
            snapshot[str(path)] = (stat.st_mtime_ns, stat.st_size)
        return snapshot

    def watch(self) -> None:
        while True:
            time.sleep(0.5)
            snapshot = self._scan()
            if snapshot != self._snapshot:
                self._snapshot = snapshot
                with self._lock:
                    self.version = time.time_ns()

    def current_version(self) -> int:
        with self._lock:
            return self.version


def make_handler(root: Path, tracker: ChangeTracker):
    class LiveReloadHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs) -> None:
            super().__init__(*args, directory=str(root), **kwargs)

        def end_headers(self) -> None:
            self.send_header("Cache-Control", "no-cache")
            super().end_headers()

        def send_head(self):
            if urlsplit(self.path).path == RELOAD_ENDPOINT:
                content = str(tracker.current_version()).encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                return io.BytesIO(content)

            requested_path = Path(self.translate_path(self.path))
            url_path = urlsplit(self.path).path

            if requested_path.is_dir() and url_path.endswith("/"):
                for index in ("index.html", "index.htm"):
                    candidate = requested_path / index
                    if candidate.is_file():
                        requested_path = candidate
                        break

            if requested_path.is_file() and requested_path.suffix.lower() in {".html", ".htm"}:
                try:
                    content = requested_path.read_bytes()
                except OSError:
                    return super().send_head()

                marker = b"</body>"
                position = content.lower().rfind(marker)
                if position >= 0:
                    content = content[:position] + RELOAD_SCRIPT + content[position:]
                else:
                    content += RELOAD_SCRIPT

                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Last-Modified", self.date_time_string(requested_path.stat().st_mtime))
                self.end_headers()
                return io.BytesIO(content)

            return super().send_head()

    return LiveReloadHandler


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Serve docs/ on the local network with automatic browser reloads."
    )
    parser.add_argument("--port", "-p", type=int, default=8000)
    parser.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help="directory to serve (default: docs/)",
    )
    args = parser.parse_args()

    root = args.root.expanduser().resolve()
    if not root.is_dir():
        parser.error(f"directory does not exist: {root}")

    tracker = ChangeTracker(root)
    threading.Thread(target=tracker.watch, daemon=True).start()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), make_handler(root, tracker))
    print(f"Serving {root} at http://0.0.0.0:{args.port}")
    print("Open this computer's LAN or Tailscale address from another device.")
    print("Watching for changes; press Ctrl-C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
