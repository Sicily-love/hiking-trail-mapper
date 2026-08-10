#!/usr/bin/env python3
"""Exercise a 200k+ point project in real Chrome and report stable budgets."""
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket

ROOT = Path(__file__).resolve().parents[2]
HTML = Path(os.environ.get("HTM_RELEASE_HTML", ROOT / "hiking-trail-mapper.html"))


def chrome_bin():
    candidates = [
        os.environ.get("CHROME_BIN"), shutil.which("google-chrome"), shutil.which("chromium"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    return next((value for value in candidates if value and Path(value).exists()), None)


def free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def report(name, valid, detail=""):
    print(f"  {'✓' if valid else '✗'} {name}" + (f" ({detail})" if detail else ""))
    return bool(valid)


chrome = chrome_bin()
if not chrome:
    raise SystemExit("Chrome not found; set CHROME_BIN")

profile = tempfile.mkdtemp(prefix="outdoor-route-scale-")
port = free_port()
process = subprocess.Popen([
    chrome, "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox",
    "--disable-crash-reporter", "--enable-precise-memory-info", "--remote-allow-origins=*",
    f"--remote-debugging-port={port}", f"--user-data-dir={profile}",
    f"file://{HTML}?studio-test=1",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
connection = None

try:
    targets = None
    for _ in range(60):
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
    connection = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=90)
    message_id = 0

    def evaluate(source):
        nonlocal_message = None
        global message_id
        message_id += 1
        nonlocal_message = message_id
        wrapped = json.dumps(source, ensure_ascii=False)
        expression = (
            f"(function(scope){{with(scope){{return eval({wrapped});}}}})"
            "(window.__HTM_RUNTIME_INSPECTOR__||{})"
        )
        connection.send(json.dumps({
            "id": nonlocal_message,
            "method": "Runtime.evaluate",
            "params": {"expression": expression, "returnByValue": True, "awaitPromise": True},
        }))
        while True:
            response = json.loads(connection.recv())
            if response.get("id") != nonlocal_message:
                continue
            result = response.get("result", {}).get("result", {})
            if result.get("subtype") == "error":
                raise RuntimeError(result.get("description", "browser evaluation failed"))
            if "exceptionDetails" in response.get("result", {}):
                raise RuntimeError(str(response["result"]["exceptionDetails"]))
            return result.get("value")

    for _ in range(100):
        if evaluate("!!window.__OUTDOOR_ROUTE_STUDIO__?.ready && !!window.__HTM_RUNTIME_INSPECTOR__"):
            break
        time.sleep(0.1)
    else:
        raise RuntimeError("Studio runtime did not become ready")

    metrics = evaluate("""
      (async () => {
        const trailCount = 12;
        const pointsPerTrail = 18000;
        const pointCount = trailCount * pointsPerTrail;
        const settle = async () => {
          for(let frame = 0; frame < 180; frame += 1) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            if(!renderScheduler.hasScheduledFrame && renderScheduler.pendingMask === 0) {
              await new Promise(resolve => requestAnimationFrame(resolve));
              if(!renderScheduler.hasScheduledFrame && renderScheduler.pendingMask === 0) return frame + 2;
            }
          }
          throw new Error('render scheduler did not become idle');
        };
        const snapshotStats = () => JSON.parse(JSON.stringify(renderRuntimeStats));
        const heapBefore = performance.memory?.usedJSHeapSize || null;
        const buildStarted = performance.now();
        const tags = ['camp', 'water', 'pass', 'bridge', 'warn', 'fork'];
        const trails = Array.from({length:trailCount}, (_, trailIndex) => {
          const track = Array.from({length:pointsPerTrail}, (_, index) => {
            const distance = index * 0.008;
            const day = Math.min(4, Math.floor(index / (pointsPerTrail / 4)) + 1);
            return [
              29.15 + trailIndex * 0.012 + index / 1_800_000,
              99.05 + trailIndex * 0.009 + Math.sin(index / 180) * 0.004,
              2400 + (index % 1200) + trailIndex * 12,
              distance,
              index * 0.42,
              day,
            ];
          });
          const id = `scale-${trailIndex}`;
          return {
            id,
            name:`Scale route ${trailIndex + 1}`,
            group:'Scale 200k',
            color:['#2F6B5F','#D96C4A','#5577B8','#8A6BBE'][trailIndex % 4],
            track,
            track_breaks:[],
            stats:{
              distance_km:track.at(-1)[3], ascent_m:track.at(-1)[4], descent_m:6100,
              max_elev:3611 + trailIndex * 12, min_elev:2400 + trailIndex * 12,
            },
            days:4,
            day_meta:Array.from({length:4}, (_, dayIndex) => ({
              d:dayIndex + 1,
              i_start:dayIndex * 4500,
              i_end:dayIndex === 3 ? pointsPerTrail - 1 : (dayIndex + 1) * 4500,
              km:36, asc:1890, desc:1525, max:3600, min:2400,
              camp:`Scale camp ${dayIndex + 1}`, camp_elev:2800 + dayIndex * 120,
            })),
            waypoints:Array.from({length:8}, (_, waypointIndex) => {
              const gpsIndex = Math.min(pointsPerTrail - 1, waypointIndex * 2200 + 300);
              const point = track[gpsIndex];
              return {
                id:`${id}-wp-${waypointIndex}`, label:`Point ${waypointIndex + 1}`,
                name:`Point ${waypointIndex + 1}`, tag:tags[waypointIndex % tags.length],
                gps_idx:gpsIndex, lat:point[0], lng:point[1], elev:point[2], km:point[3],
              };
            }),
            escape_routes:[],
          };
        });
        const buildMs = performance.now() - buildStarted;
        const ids = trails.map(trail => trail.id);
        const before = snapshotStats();
        const renderStarted = performance.now();
        testDriver.replaceProject({title:'Scale 200k project', trails, calc_method:{}});
        stateActions.setActiveGroup('Scale 200k');
        stateActions.replaceActiveTrails(ids);
        stateActions.setGroupPrimary('Scale 200k', ids[0]);
        stateActions.setPrimaryTrail(ids[0]);
        stateActions.setMode('elev');
        rebuildAll({fit:false});
        const settleFrames = await settle();
        const firstRenderMs = performance.now() - renderStarted;
        const afterFirst = snapshotStats();

        const resetStarted = performance.now();
        const resetApplied = await resetView({gesture:false});
        await settle();
        const resetMs = performance.now() - resetStarted;

        const repeatStarted = performance.now();
        rebuildAll({fit:false});
        await settle();
        const repeatRenderMs = performance.now() - repeatStarted;
        const afterRepeat = snapshotStats();
        const heapAfter = performance.memory?.usedJSHeapSize || null;
        const canvas = document.querySelector('#elev-bar canvas');
        return {
          trailCount:DATA.trails.length,
          activeTrailCount:state.activeTrails.size,
          pointCount,
          buildMs, firstRenderMs, repeatRenderMs, resetMs, resetApplied, settleFrames,
          frameDelta:afterFirst.frames - before.frames,
          trackLayerCount:trackLayer.getLayers().length,
          markerCount:Object.keys(wpMarkers).length,
          markerRepeat:afterRepeat.markers,
          elevationSource:afterRepeat.elevation.sourcePoints,
          elevationRendered:afterRepeat.elevation.renderedPoints,
          canvasWidth:canvas?.getBoundingClientRect().width || 0,
          heapBefore, heapAfter,
          heapDelta:heapBefore && heapAfter ? heapAfter - heapBefore : null,
        };
      })()
    """)

    print("\nLarge project real Chrome")
    checks = [
        report("loads 12 trails and 216,000 points", metrics["trailCount"] == 12 and metrics["activeTrailCount"] == 12 and metrics["pointCount"] == 216000),
        report("coalesces the first workspace render", 1 <= metrics["frameDelta"] <= 4, f"{metrics['frameDelta']} frames"),
        report("keeps Leaflet elevation layers bounded", 1 <= metrics["trackLayerCount"] <= 500, f"{metrics['trackLayerCount']} layers"),
        report("keeps marker instances stable on a repeated render", metrics["markerRepeat"]["add"] == 0 and metrics["markerRepeat"]["update"] == 0 and metrics["markerRepeat"]["remove"] == 0, str(metrics["markerRepeat"])),
        report("downsamples the elevation canvas", metrics["elevationSource"] == 18000 and metrics["elevationRendered"] <= max(2, metrics["canvasWidth"] * 2 + 4), f"{metrics['elevationRendered']}/{metrics['elevationSource']}"),
        report("resets the large primary route without a stalled frame", metrics["resetApplied"] and metrics["resetMs"] < 5000, f"{metrics['resetMs']:.0f} ms"),
        report("renders within a conservative CI budget", metrics["buildMs"] < 5000 and metrics["firstRenderMs"] < 15000 and metrics["repeatRenderMs"] < 10000, f"build {metrics['buildMs']:.0f} / first {metrics['firstRenderMs']:.0f} / repeat {metrics['repeatRenderMs']:.0f} ms"),
        report("stays below the large-project heap guard", metrics["heapAfter"] is None or metrics["heapAfter"] < 700 * 1024 * 1024, f"{(metrics['heapAfter'] or 0) / 1024 / 1024:.1f} MiB"),
    ]
    print("Metrics:", json.dumps(metrics, ensure_ascii=False, separators=(",", ":")))
    print(f"结果: {sum(checks)}/{len(checks)} passed")
    raise SystemExit(0 if all(checks) else 1)
finally:
    if connection:
        connection.close()
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)
    shutil.rmtree(profile, ignore_errors=True)
