#!/usr/bin/env python3
"""Capture repeatable Field Console screenshots with real system Chrome."""
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket

ROOT = Path(__file__).resolve().parents[2]
HTML = Path(os.environ.get("HTM_RELEASE_HTML", ROOT / "hiking-trail-mapper.html"))
SAMPLE = ROOT / "examples/sample-trails/格聂牧场+v线.kml"
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / "outdoor-route-studio"


def chrome_bin():
    candidates = [
        os.environ.get("CHROME_BIN"),
        shutil.which("google-chrome"),
        shutil.which("chromium"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    return next((value for value in candidates if value and Path(value).exists()), None)


def free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


chrome = chrome_bin()
if not chrome:
    raise SystemExit("Chrome not found; set CHROME_BIN")
OUTPUT.mkdir(parents=True, exist_ok=True)
profile = tempfile.mkdtemp(prefix="hiking-visual-")
port = free_port()
process = subprocess.Popen([
    chrome,
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--remote-allow-origins=*",
    f"--remote-debugging-port={port}",
    f"--user-data-dir={profile}",
    f"file://{HTML}?studio-test=1",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    targets = None
    for _ in range(50):
        try:
            targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1).read())
            if targets:
                break
        except Exception:
            time.sleep(0.2)
    if not targets:
        raise RuntimeError("Chrome did not expose a page target")
    pages = [target for target in targets if target.get("type") == "page"]
    page = next((target for target in pages if HTML.name in target.get("url", "")), pages[0])
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
    message_id = 0

    def cdp(method, params=None):
        nonlocal_id = None
        global message_id
        message_id += 1
        nonlocal_id = message_id
        payload = {"id": nonlocal_id, "method": method}
        if params:
            payload["params"] = params
        ws.send(json.dumps(payload))
        while True:
            response = json.loads(ws.recv())
            if response.get("id") == nonlocal_id:
                return response

    def evaluate(expression):
        source = json.dumps(expression, ensure_ascii=False)
        expression = f"(function(scope) {{ with(scope) {{ return eval({source}); }} }})(window.__HTM_RUNTIME_INSPECTOR__ || {{}})"
        response = cdp("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        })
        result = response.get("result", {}).get("result", {})
        if result.get("subtype") == "error":
            raise RuntimeError(result.get("description", "browser evaluation failed"))
        return result.get("value")

    for _ in range(80):
        if evaluate("!!window.__OUTDOOR_ROUTE_STUDIO__?.ready && !!window.__HTM_RUNTIME_INSPECTOR__"):
            break
        time.sleep(0.1)
    else:
        detail = evaluate("({href: location.href, studio: !!window.__OUTDOOR_ROUTE_STUDIO__, inspector: !!window.__HTM_RUNTIME_INSPECTOR__})")
        raise RuntimeError(f"Studio direct runtime did not become ready: {detail}")

    def hide_transient_ui():
        evaluate("document.getElementById('toast')?.style.setProperty('display', 'none', 'important')")

    def wait_for_map_tiles(timeout=8):
        deadline = time.time() + timeout
        while time.time() < deadline:
            status = evaluate("""
              (() => {
                const visible = [...document.querySelectorAll('.leaflet-tile-pane .leaflet-tile')]
                  .filter(tile => {
                    const rect = tile.getBoundingClientRect();
                    const style = getComputedStyle(tile.parentElement);
                    return style.opacity !== '0' && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
                  });
                return {
                  total: visible.length,
                  ready: visible.filter(tile => tile.complete && tile.naturalWidth > 0).length,
                  loading: visible.filter(tile => tile.classList.contains('leaflet-tile-loading')).length,
                };
              })()
            """)
            if status["total"] and status["ready"] == status["total"] and not status["loading"]:
                return status
            time.sleep(0.2)
        return status

    cdp("Page.enable")
    cdp("Runtime.enable")
    time.sleep(2.5)
    sample_b64 = base64.b64encode(SAMPLE.read_bytes()).decode("ascii")
    trail_count = evaluate(f"""
      (async () => {{
        DATA.trails = [];
        state.activeTrails = new Set();
        const bytes = Uint8Array.from(atob('{sample_b64}'), c => c.charCodeAt(0));
        const file = {{
          name: 'workbench-sample.kml',
          text: async () => new TextDecoder().decode(bytes),
          arrayBuffer: async () => bytes.buffer,
        }};
        await handleFiles([file]);
        document.getElementById('add-trail-modal')?.classList.remove('open');
        resetView();
        return DATA.trails.length;
      }})()
    """)
    if not trail_count:
        raise RuntimeError("Sample KML did not produce a trail")
    time.sleep(1)

    viewports = [(1440, 900), (1024, 768), (390, 844), (320, 568)]
    report = []
    for width, height in viewports:
        cdp("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": width <= 760,
        })
        evaluate(f"""
          (() => {{
            document.getElementById('elev-bar')?.classList.remove('collapsed');
            if({str(width <= 760).lower()}) {{
              toggleSidebar(true);
              resetView();
            }} else toggleSidebar(true);
            window.dispatchEvent(new Event('resize'));
          }})()
        """)
        time.sleep(0.5)
        metrics = evaluate("""
          (() => {
            const rect = id => {
              const node = document.getElementById(id);
              if(!node) return null;
              const r = node.getBoundingClientRect();
              return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
            };
            const buttons = [...document.querySelectorAll('#map-toolbar .tb-btn')];
            const toolbar = rect('map-toolbar');
            const zoomNode = document.querySelector('.leaflet-control-zoom');
            const zoomRect = zoomNode?.getBoundingClientRect();
            const zoom = zoomRect ? {left:zoomRect.left, top:zoomRect.top, right:zoomRect.right, bottom:zoomRect.bottom, width:zoomRect.width, height:zoomRect.height} : null;
            const elevation = rect('elev-bar');
            const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            return {
              viewport:{width:innerWidth,height:innerHeight},
              toolbar, zoom, sidebar:rect('sidebar'), elevation,
              toolbarElevationOverlap:overlaps(toolbar, elevation),
              toolbarZoomOverlap:overlaps(toolbar, zoom),
              toolbarOutOfViewport:!toolbar || toolbar.left < 0 || toolbar.right > innerWidth || toolbar.top < 0 || toolbar.bottom > innerHeight,
              elevationOutOfViewport:!elevation || elevation.left < 0 || elevation.right > innerWidth || elevation.top < 0 || elevation.bottom > innerHeight,
              bodyOverflowX:document.documentElement.scrollWidth > innerWidth,
              buttonOverflow:buttons.some(button => button.scrollWidth > button.clientWidth || button.scrollHeight > button.clientHeight),
              appRuntime:!!HTM_APP,
              mobileResetClosesSidebar:innerWidth > 760 || document.getElementById('sidebar')?.classList.contains('collapsed'),
            };
          })()
        """)
        metrics["name"] = f"{width}x{height}"
        report.append(metrics)
        hide_transient_ui()
        wait_for_map_tiles()
        screenshot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
        (OUTPUT / f"workbench-{width}x{height}.png").write_bytes(base64.b64decode(screenshot["result"]["data"]))

    cdp("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 800, "deviceScaleFactor": 1, "mobile": False})
    evaluate("""
      (() => {
        toggleSidebar(true);
        document.getElementById('workbench-activity-groups')?.click();
        window.dispatchEvent(new Event('resize'));
      })()
    """)
    time.sleep(0.4)
    group_state = evaluate("""
      document.getElementById('tab-groups')?.classList.contains('active')
        && document.getElementById('workbench-activity-groups')?.classList.contains('is-active')
        && getComputedStyle(document.getElementById('primary-card')).display === 'none'
        && document.querySelectorAll('#trail-group-list .group-tab').length > 0
    """)
    hide_transient_ui()
    wait_for_map_tiles()
    group_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-trail-groups.png").write_bytes(base64.b64decode(group_shot["result"]["data"]))

    evaluate("""
      (() => {
        measureState.active && measureExit();
        segmentState.active && segmentExit();
        toggleSidebar(true);
        document.querySelector('.tab[data-tab="days"]')?.click();
        window.dispatchEvent(new Event('resize'));
      })()
    """)
    time.sleep(0.5)
    day_state = evaluate("document.querySelectorAll('#tab-days .day-block').length")
    hide_transient_ui()
    wait_for_map_tiles()
    day_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-day-cards.png").write_bytes(base64.b64decode(day_shot["result"]["data"]))

    evaluate("""
      (() => {
        toggleSidebar(false);
        measureEnter();
        const main = DATA.trails.find(trail => trail.id === state.primaryTrailId);
        measureState.ptA = pointFromTrackIndex(main.track, Math.floor(main.track.length * 0.18));
        measureState.ptB = pointFromTrackIndex(main.track, Math.floor(main.track.length * 0.72));
        measureCompute();
      })()
    """)
    time.sleep(0.6)
    measure_state = evaluate("measureState.active && !!measureState.ptA && !!measureState.ptB && getComputedStyle(document.getElementById('measure-panel')).display !== 'none'")
    hide_transient_ui()
    wait_for_map_tiles()
    measure_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-measure.png").write_bytes(base64.b64decode(measure_shot["result"]["data"]))

    evaluate("""
      (() => {
        measureExit();
        segmentEnter();
        const main = DATA.trails.find(trail => trail.id === state.primaryTrailId);
        segmentState.points = HTM_CORE.segmentIndexesToPoints(
          main.track,
          [0, Math.floor(main.track.length * 0.46), main.track.length - 1],
        );
        updateSegmentUI();
      })()
    """)
    time.sleep(0.6)
    segment_state = evaluate("segmentState.active && segmentState.points.length === 3 && document.querySelectorAll('#segment-list .segment-day-card').length === 2")
    hide_transient_ui()
    wait_for_map_tiles()
    segment_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-segment.png").write_bytes(base64.b64decode(segment_shot["result"]["data"]))

    evaluate("""
      (() => {
        segmentExit();
        window.__visualDialogPromise = window.__OUTDOOR_ROUTE_STUDIO__?.dialogs.prompt({
          title:'Rename trail',
          message:'Update the route name used across the workspace.',
          inputLabel:'Trail name',
          value:'Genie Ranch + V Route',
          required:true,
          selectOnOpen:true,
          confirmLabel:'Save',
          cancelLabel:'Cancel',
        });
        return true;
      })()
    """)
    time.sleep(0.3)
    dialog_state = evaluate("""
      (() => {
        const dialog = document.querySelector('dialog.workbench-dialog[open]');
        const surface = dialog?.querySelector('.workbench-dialog__surface');
        const input = dialog?.querySelector('input');
        const rect = surface?.getBoundingClientRect();
        return !!dialog && !!surface && !!input
          && document.activeElement === input
          && rect.left >= 0 && rect.top >= 0
          && rect.right <= innerWidth && rect.bottom <= innerHeight
          && surface.scrollWidth <= surface.clientWidth;
      })()
    """)
    dialog_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-dialog.png").write_bytes(base64.b64decode(dialog_shot["result"]["data"]))
    evaluate("document.querySelector('dialog.workbench-dialog[open] .workbench-dialog__button--secondary')?.click()")
    time.sleep(0.1)

    cdp("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
    evaluate("toggleSidebar(true)")
    time.sleep(0.4)
    hide_transient_ui()
    wait_for_map_tiles()
    sheet = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-390x844-sheet.png").write_bytes(base64.b64decode(sheet["result"]["data"]))
    evaluate("""
      (() => {
        toggleSidebar(false);
        window.__visualMobileDialogPromise = window.__OUTDOOR_ROUTE_STUDIO__?.dialogs.confirm({
          title:'Clear project?',
          message:'This removes every trail, waypoint, and itinerary from the current workspace.',
          confirmLabel:'Clear project',
          cancelLabel:'Keep project',
          tone:'danger',
        });
        return true;
      })()
    """)
    time.sleep(0.3)
    mobile_dialog_state = evaluate("""
      (() => {
        const dialog = document.querySelector('dialog.workbench-dialog[open]');
        const surface = dialog?.querySelector('.workbench-dialog__surface');
        const actions = dialog?.querySelector('.workbench-dialog__actions');
        const buttons = [...(dialog?.querySelectorAll('.workbench-dialog__button') || [])];
        const rect = surface?.getBoundingClientRect();
        return !!dialog && !!surface && !!actions && buttons.length === 2
          && rect.left >= 0 && rect.top >= 0
          && rect.right <= innerWidth && rect.bottom <= innerHeight
          && surface.scrollWidth <= surface.clientWidth
          && actions.scrollWidth <= actions.clientWidth
          && buttons.every(button => button.scrollWidth <= button.clientWidth);
      })()
    """)
    mobile_dialog_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-dialog-mobile.png").write_bytes(base64.b64decode(mobile_dialog_shot["result"]["data"]))
    evaluate("document.querySelector('dialog.workbench-dialog[open] .workbench-dialog__button--secondary')?.click()")
    time.sleep(0.1)
    (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    invalid = [item["name"] for item in report if item["bodyOverflowX"] or item["buttonOverflow"] or item["toolbarElevationOverlap"] or item["toolbarZoomOverlap"] or item["toolbarOutOfViewport"] or item["elevationOutOfViewport"] or not item["appRuntime"] or not item["mobileResetClosesSidebar"]]
    if not group_state or not day_state or not measure_state or not segment_state or not dialog_state or not mobile_dialog_state:
        invalid.append("interaction-states")
    if invalid:
        raise RuntimeError(f"Visual layout contract failed: {', '.join(invalid)}")
    ws.close()
    print(OUTPUT)
    print(json.dumps(report, ensure_ascii=False))
finally:
    process.terminate()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()
    shutil.rmtree(profile, ignore_errors=True)
