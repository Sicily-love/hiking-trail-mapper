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
        stateActions.replaceActiveTrails([]);
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
            const map = rect('map');
            const primaryMini = rect('primary-mini');
            const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            const inside = (inner, outer) => !!inner && !!outer
              && inner.left >= outer.left && inner.right <= outer.right
              && inner.top >= outer.top && inner.bottom <= outer.bottom;
            return {
              viewport:{width:innerWidth,height:innerHeight},
              toolbar, zoom, sidebar:rect('sidebar'), elevation, primaryMini,
              toolbarElevationOverlap:overlaps(toolbar, elevation),
              toolbarZoomOverlap:overlaps(toolbar, zoom),
              toolbarOutOfViewport:!toolbar || toolbar.left < 0 || toolbar.right > innerWidth || toolbar.top < 0 || toolbar.bottom > innerHeight,
              elevationOutOfViewport:!elevation || elevation.left < 0 || elevation.right > innerWidth || elevation.top < 0 || elevation.bottom > innerHeight,
              bodyOverflowX:document.documentElement.scrollWidth > innerWidth,
              buttonOverflow:buttons.some(button => button.scrollWidth > button.clientWidth || button.scrollHeight > button.clientHeight),
              appRuntime:!!HTM_APP,
              mobileResetClosesSidebar:innerWidth > 760 || document.getElementById('sidebar')?.classList.contains('collapsed'),
              primaryMiniCompact:innerWidth > 760 || (!!primaryMini && primaryMini.width <= 224 && primaryMini.height <= 90),
              primaryMiniInsideMap:innerWidth > 760 || inside(primaryMini, map),
            };
          })()
        """)
        metrics["name"] = f"{width}x{height}"
        report.append(metrics)
        hide_transient_ui()
        wait_for_map_tiles()
        screenshot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
        (OUTPUT / f"workbench-{width}x{height}.png").write_bytes(base64.b64decode(screenshot["result"]["data"]))

    cdp("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    time.sleep(0.25)
    evaluate("""
      (async () => {
        const trail = DATA.trails[0];
        if(!trail) return false;
        window.__visualOriginalTrailName = trail.name;
        trailController.renameTrail(
          trail.id,
          '这是一条用于验证侧栏固定宽度与自动省略效果的超长轨迹名称VeryLongTrailNameWithoutSpaces',
        );
        toggleSidebar(true);
        window.dispatchEvent(new Event('resize'));
        map.invalidateSize({pan:false, animate:false});
        await resetView();
        return true;
      })()
    """)
    time.sleep(0.3)
    long_name_state = evaluate("""
      (() => {
        const sidebar = document.getElementById('sidebar');
        const cardName = document.querySelector('#trail-list .trail-name');
        const primaryName = document.getElementById('pc-name');
        const ellipsized = node => !!node
          && getComputedStyle(node).textOverflow === 'ellipsis'
          && getComputedStyle(node).whiteSpace === 'nowrap'
          && node.scrollWidth > node.clientWidth;
        return {
          valid:Math.abs((sidebar?.getBoundingClientRect().width || 0) - 310) < 1
            && ellipsized(cardName) && ellipsized(primaryName),
          sidebarWidth:sidebar?.getBoundingClientRect().width || 0,
          cardEllipsized:ellipsized(cardName),
          primaryEllipsized:ellipsized(primaryName),
        };
      })()
    """)
    time.sleep(0.3)
    hide_transient_ui()
    long_name_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-long-trail-name.png").write_bytes(base64.b64decode(long_name_shot["result"]["data"]))
    evaluate("trailController.renameTrail(DATA.trails[0].id, window.__visualOriginalTrailName)")
    time.sleep(0.2)

    cdp("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 800, "deviceScaleFactor": 1, "mobile": False})
    elevation_collapse_state = evaluate("""
      (() => {
        toggleSidebar(true);
        const toggle = document.getElementById('elev-toggle');
        const panel = document.getElementById('elev-bar');
        if(panel?.classList.contains('collapsed')) toggle?.click();
        const expandedMapHeight = document.getElementById('map')?.getBoundingClientRect().height || 0;
        toggle?.click();
        window.dispatchEvent(new Event('resize'));
        const mapHeight = document.getElementById('map')?.getBoundingClientRect().height || 0;
        const dockHeight = document.querySelector('.studio-bottom-dock')?.getBoundingClientRect().height || 0;
        return {
          collapsed:panel?.classList.contains('collapsed') || false,
          expanded:toggle?.getAttribute('aria-expanded'),
          buttonVisible:!!toggle && getComputedStyle(toggle).display !== 'none',
          compact:dockHeight <= 45,
          mapExpanded:mapHeight > expandedMapHeight + 100,
        };
      })()
    """)
    time.sleep(0.4)
    hide_transient_ui()
    wait_for_map_tiles()
    elevation_collapsed_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-elevation-collapsed.png").write_bytes(base64.b64decode(elevation_collapsed_shot["result"]["data"]))
    evaluate("document.getElementById('elev-toggle')?.click()")
    time.sleep(0.2)

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
    measure_state = evaluate("""
      (() => {
        const panel = document.getElementById('measure-panel');
        const buttons = [...(panel?.querySelectorAll('button') || [])];
        const visible = node => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 0 && rect.height > 0
            && rect.left >= 0 && rect.top >= 0
            && rect.right <= innerWidth && rect.bottom <= innerHeight;
        };
        const panelRect = panel?.getBoundingClientRect();
        const center = panelRect && document.elementFromPoint(
          panelRect.left + panelRect.width / 2,
          panelRect.top + panelRect.height / 2,
        );
        return {
          active:measureState.active && !!measureState.ptA && !!measureState.ptB,
          visible:!!panel && visible(panel),
          buttonCount:buttons.length,
          buttonsVisible:buttons.every(visible),
          rect:panelRect ? {left:panelRect.left, top:panelRect.top, right:panelRect.right, bottom:panelRect.bottom, width:panelRect.width, height:panelRect.height} : null,
          opacity:panel ? getComputedStyle(panel).opacity : null,
          topElement:center ? `${center.tagName.toLowerCase()}#${center.id}.${center.className}` : null,
        };
      })()
    """)
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
        enterAddWaypointMode({announce:false});
        const main = DATA.trails.find(trail => trail.id === state.primaryTrailId);
        const point = main.track[Math.floor(main.track.length * 0.35)];
        dispatchRuntimeInteraction('waypoint', {
          type:'tap', source:'visual-regression', latlng:{lat:point[0], lng:point[1]}, requireNear:true,
        });
      })()
    """)
    time.sleep(0.3)
    waypoint_dialog_state = evaluate("""
      (() => {
        const dialog = document.querySelector('dialog.workbench-dialog[open]');
        const surface = dialog?.querySelector('.workbench-dialog__surface');
        const select = dialog?.querySelector('#manual-waypoint-tag');
        const preview = dialog?.querySelector('.waypoint-type-select-preview');
        if(select) {
          select.value = 'fork';
          select.dispatchEvent(new Event('change', {bubbles:true}));
        }
        const symbol = preview?.querySelector('svg.waypoint-symbol');
        const previewRect = preview?.getBoundingClientRect();
        const symbolRect = symbol?.getBoundingClientRect();
        const rect = surface?.getBoundingClientRect();
        return !!dialog && !!surface && select instanceof HTMLSelectElement
          && select.options.length === 13
          && ['fork','warn','other'].every(tag => [...select.options].some(option => option.value === tag))
          && symbol?.getAttribute('data-lucide') === 'git-fork'
          && Math.abs(symbolRect.width - 16) < .5
          && Math.abs(symbolRect.height - 16) < .5
          && Math.abs((symbolRect.left + symbolRect.width / 2) - (previewRect.left + previewRect.width / 2)) < .5
          && Math.abs((symbolRect.top + symbolRect.height / 2) - (previewRect.top + previewRect.height / 2)) < .5
          && rect.left >= 0 && rect.top >= 0
          && rect.right <= innerWidth && rect.bottom <= innerHeight
          && surface.scrollWidth <= surface.clientWidth;
      })()
    """)
    waypoint_dialog_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-waypoint-types.png").write_bytes(base64.b64decode(waypoint_dialog_shot["result"]["data"]))
    evaluate("document.querySelector('dialog.workbench-dialog[open] .workbench-dialog__actions .workbench-dialog__button:not([type=\"submit\"])')?.click()")
    time.sleep(0.1)

    evaluate("""
      (() => {
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

    evaluate("""
      (() => {
        const source = DATA.trails[0];
        const fixture = JSON.parse(JSON.stringify(source));
        fixture.id = 'visual-stitch-fixture';
        fixture.name = 'Stitch range fixture';
        fixture.track.reverse();
        fixture.waypoints = [];
        DATA.trails.push(fixture);
        window.__visualStitchPromise = window.__OUTDOOR_ROUTE_STUDIO__.commands.dispatch('trail.stitch');
        return true;
      })()
    """)
    time.sleep(0.3)
    stitch_dialog_state = evaluate("""
      (() => {
        const dialog = document.querySelector('dialog.workbench-dialog[open]');
        const surface = dialog?.querySelector('.workbench-dialog__surface');
        const body = dialog?.querySelector('.workbench-dialog__body');
        const rows = [...(dialog?.querySelectorAll('.stitch-trail-row') || [])];
        const rect = surface?.getBoundingClientRect();
        return !!dialog && !!surface && rows.length === 2
          && rows.every(row => row.querySelector('.stitch-trail-check'))
          && rows.every(row => !row.querySelector('.stitch-trail-check').checked)
          && rect.left >= 0 && rect.top >= 0
          && rect.right <= innerWidth && rect.bottom <= innerHeight
          && surface.scrollWidth <= surface.clientWidth
          && body.scrollWidth <= body.clientWidth;
      })()
    """)
    stitch_dialog_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-stitch-sources.png").write_bytes(base64.b64decode(stitch_dialog_shot["result"]["data"]))
    evaluate("""
      (async () => {
        document.querySelectorAll('dialog.workbench-dialog[open] .stitch-trail-check').forEach(input => { input.checked = true; });
        document.querySelector('dialog.workbench-dialog[open] .workbench-dialog__button--primary')?.click();
        await window.__visualStitchPromise;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const endpointLabels = stitchLayer.getLayers()
          .filter(layer => layer._stitchRole === 'endpoint')
          .map(layer => layer._icon?.textContent?.trim());
        const endpointOffsets = new Set(stitchLayer.getLayers()
          .filter(layer => layer._stitchRole === 'endpoint')
          .map(layer => {
            const icon = layer._icon?.querySelector('.stitch-endpoint-marker');
            return `${icon?.style.getPropertyValue('--stitch-offset-x')}:${icon?.style.getPropertyValue('--stitch-offset-y')}`;
          }));
        const selectedId = stitchState.selectedPartId;
        const activeLine = stitchLayer.getLayers().find(layer =>
          layer._stitchRole === 'selection' && layer._stitchPartId === selectedId);
        window.__visualStitchWorkbenchValid = document.getElementById('stitch-panel')?.classList.contains('is-open')
          && document.querySelectorAll('.stitch-part-card').length === 2
          && ['1A','1B','2A','2B'].every(label => endpointLabels.includes(label))
          && endpointOffsets.size > 1
          && activeLine?.options?.weight >= 8
          && activeLine?.options?.opacity === 1;
      })()
    """)
    time.sleep(0.4)
    wait_for_map_tiles()
    stitch_editor_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-stitch-editor.png").write_bytes(base64.b64decode(stitch_editor_shot["result"]["data"]))
    evaluate("""
      (async () => {
        await requestStitchExit(true);
        DATA.trails = DATA.trails.filter(trail => trail.id !== 'visual-stitch-fixture');
      })()
    """)
    time.sleep(0.1)
    stitch_dialog_state = bool(stitch_dialog_state and evaluate("!!window.__visualStitchWorkbenchValid"))

    evaluate("""
      (() => {
        const existing = document.getElementById('toast');
        existing?.style.removeProperty('display');
        showToast('轨迹已保存，提示文字清晰可读', 'info', 5000);
      })()
    """)
    time.sleep(0.3)
    toast_state = evaluate("""
      (() => {
        const toast = document.getElementById('toast');
        const dock = document.querySelector('.studio-bottom-dock');
        const rect = toast?.getBoundingClientRect();
        const dockRect = dock?.getBoundingClientRect();
        const style = toast ? getComputedStyle(toast) : null;
        return {
          visible:!!toast && toast.classList.contains('is-visible') && style.visibility === 'visible',
          readable:parseFloat(style?.fontSize || '0') >= 13
            && style?.color === 'rgb(23, 33, 27)'
            && style?.backgroundColor === 'rgb(248, 251, 249)',
          clearsDock:!!rect && !!dockRect && rect.bottom <= dockRect.top - 8,
          inViewport:!!rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0,
          semantic:toast?.getAttribute('role') === 'status' && toast?.getAttribute('aria-live') === 'polite',
        };
      })()
    """)
    toast_shot = cdp("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    (OUTPUT / "workbench-toast.png").write_bytes(base64.b64decode(toast_shot["result"]["data"]))
    hide_transient_ui()

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
    invalid = [item["name"] for item in report if item["bodyOverflowX"] or item["buttonOverflow"] or item["toolbarElevationOverlap"] or item["toolbarZoomOverlap"] or item["toolbarOutOfViewport"] or item["elevationOutOfViewport"] or not item["appRuntime"] or not item["mobileResetClosesSidebar"] or not item["primaryMiniCompact"] or not item["primaryMiniInsideMap"]]
    elevation_collapse_valid = all([
        elevation_collapse_state.get("collapsed"),
        elevation_collapse_state.get("expanded") == "false",
        elevation_collapse_state.get("buttonVisible"),
        elevation_collapse_state.get("compact"),
        elevation_collapse_state.get("mapExpanded"),
    ])
    measure_state_valid = all([
        measure_state.get("active"),
        measure_state.get("visible"),
        measure_state.get("buttonCount") == 3,
        measure_state.get("buttonsVisible"),
        measure_state.get("opacity") != "0",
        measure_state.get("topElement", "").startswith(("button#measure-", "div#.panel-actions")),
    ])
    toast_state_valid = all(toast_state.values())
    if not long_name_state.get("valid") or not group_state or not day_state or not measure_state_valid or not segment_state or not waypoint_dialog_state or not dialog_state or not stitch_dialog_state or not toast_state_valid or not mobile_dialog_state or not elevation_collapse_valid:
        invalid.append("interaction-states")
    if invalid:
        print(json.dumps({
            "longName":long_name_state,
            "group":bool(group_state),
            "day":bool(day_state),
            "measure":measure_state,
            "segment":bool(segment_state),
            "waypointDialog":bool(waypoint_dialog_state),
            "dialog":bool(dialog_state),
            "stitchDialog":bool(stitch_dialog_state),
            "toast":toast_state,
            "mobileDialog":bool(mobile_dialog_state),
            "elevationCollapse":elevation_collapse_valid,
        }, ensure_ascii=False))
        raise RuntimeError(f"Visual layout contract failed: {', '.join(invalid)}")
    ws.close()
    print(OUTPUT)
    print(json.dumps({"measure":measure_state}, ensure_ascii=False))
    print(json.dumps(report, ensure_ascii=False))
finally:
    process.terminate()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()
    shutil.rmtree(profile, ignore_errors=True)
