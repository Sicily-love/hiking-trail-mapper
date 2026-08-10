#!/usr/bin/env python3
"""Install the generated Pages shell in real Chrome, then reopen it with the server offline."""
import os
import shutil
import subprocess
import tempfile
import threading
import time
import json
import socket
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import websocket

ROOT = Path(__file__).resolve().parents[2]
DIST = Path(os.environ.get("HTM_PWA_DIST", ROOT / ".vite-build"))


def chrome_bin():
    candidates = [
        os.environ.get("CHROME_BIN"), shutil.which("google-chrome"), shutil.which("chromium"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    return next((value for value in candidates if value and Path(value).exists()), None)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def inspect_page(chrome, profile, url, expression):
    debug_port = free_port()
    process = subprocess.Popen([
        chrome, "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox",
        "--disable-crash-reporter", "--remote-allow-origins=*",
        f"--remote-debugging-port={debug_port}", f"--user-data-dir={profile}", url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    connection = None
    try:
        targets = None
        for _ in range(60):
            try:
                targets = json.loads(urllib.request.urlopen(
                    f"http://127.0.0.1:{debug_port}/json", timeout=1).read())
                if targets:
                    break
            except Exception:
                time.sleep(0.2)
        if not targets:
            return False, "Chrome did not expose a page target"
        pages = [target for target in targets if target.get("type") == "page"]
        page = next((target for target in pages if "127.0.0.1" in target.get("url", "")), pages[0])
        connection = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=20)
        message_id = 0

        def evaluate(source):
            nonlocal message_id
            message_id += 1
            connection.send(json.dumps({
                "id":message_id, "method":"Runtime.evaluate",
                "params":{"expression":source, "returnByValue":True, "awaitPromise":True},
            }))
            while True:
                response = json.loads(connection.recv())
                if response.get("id") == message_id:
                    return response.get("result", {}).get("result", {}).get("value")

        for _ in range(80):
            if evaluate(expression):
                return True, ""
            time.sleep(0.15)
        return False, str(evaluate("({href:location.href, title:document.title, state:document.documentElement.dataset})"))
    finally:
        if connection:
            connection.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def report(name, valid, detail=""):
    print(f"  {'✓' if valid else '✗'} {name}" + (f" ({detail})" if detail else ""))
    return valid


if not DIST.joinpath("service-worker.js").exists():
    raise SystemExit(f"Missing PWA build: {DIST}")
chrome = chrome_bin()
if not chrome:
    raise SystemExit("Chrome not found; set CHROME_BIN")
profile = tempfile.mkdtemp(prefix="outdoor-route-pwa-")
handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(DIST), **kwargs)
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f"http://127.0.0.1:{server.server_port}/?studio-test=1"

try:
    print("\nPWA real Chrome")
    installed, online_error = inspect_page(chrome, profile, url, """
      (async () => {
        if(document.documentElement.dataset.offlineShell !== 'registered') return false;
        await navigator.serviceWorker.ready;
        return document.documentElement.dataset.workbench === '2';
      })()
    """)
    one = report("service worker registers from the generated Pages build", installed, online_error[:120])
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)
    time.sleep(0.4)
    reopened, offline_error = inspect_page(chrome, profile, url,
        "document.documentElement.dataset.workbench === '2' && !!window.__OUTDOOR_ROUTE_STUDIO__")
    two = report("cached application shell reopens after the server is offline", reopened, offline_error[:120])
    print(f"结果: {int(one) + int(two)}/2 passed")
    raise SystemExit(0 if one and two else 1)
finally:
    try:
        server.shutdown()
        server.server_close()
    except Exception:
        pass
    shutil.rmtree(profile, ignore_errors=True)
