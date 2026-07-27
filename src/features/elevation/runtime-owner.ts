export interface ElevationRuntimeDependencies {
  document: Document;
  window: Window;
  leaflet: any;
  map: any;
  app: any;
  core: any;
  [name: string]: any;
}

/** Owns elevation Canvas rendering, hit testing, and temporary map inspection. */
export function createElevationRuntime(dependencies: ElevationRuntimeDependencies) {
  const {
    document, window, leaflet:L, map, app, core, selectors, projectSelectors,
    measureState, dayPreviewState, trackBreaksInRange, t, invalidateChart,
    renderRuntimeStats, formatTrackPointCoordinates,
  } = dependencies;
  const canvas:any = document.getElementById('elev-canvas');
  const context = canvas?.getContext('2d') || null;
  const crosshair:any = document.getElementById('elev-crosshair');
  const tip:any = document.getElementById('elev-tip');
  const label:any = document.getElementById('elev-label');
  const renderer:any = context ? app.createElevationCanvasRenderer(context) : null;
  let data:any = null;
  let clickMarker:any = null;

  function updateBadges(badges:any):void {
    const ascent = document.getElementById('elev-stat-asc');
    const descent = document.getElementById('elev-stat-desc');
    if(ascent) ascent.textContent = badges.ascentText;
    if(descent) descent.textContent = badges.descentText;
  }

  function draw(points:any[], color?:string, title?:string, options:any = {}):void {
    if(!canvas || !renderer || !points || points.length < 2) return;
    const dimensions = {
      width:canvas.offsetWidth || 340,
      height:canvas.offsetHeight || 140,
      dpr:window.devicePixelRatio || 1,
    };
    const scene = app.buildElevationCanvasScene(points, {
      ...options, width:dimensions.width, height:dimensions.height,
      axisLabel:t('elev.km'), campLabel:t('elev.anno.camp'), measureText:renderer.measureText,
    });
    data = {
      pts:points, minE:scene.layout.minE, maxE:scene.layout.maxE, color:color || '#3F5238',
      km:scene.layout.km, PL:scene.layout.PL, PR:scene.layout.PR, pw:scene.layout.pw,
    };
    if(label) label.textContent = title || t('elev.title');
    updateBadges(scene.chart.badges);
    renderRuntimeStats.elevation = {sourcePoints:scene.sourcePoints, renderedPoints:scene.renderedPoints};
    renderer.render(scene, dimensions);
  }

  function buildStackContext(main:any):any {
    let points = main.track;
    const layout:any = {width:canvas.offsetWidth || 340, height:140, trackBreaks:main.track_breaks};
    const annotations:any = {
      waypoints:main.waypoints, segIdxStart:0, segIdxEnd:main.track.length - 1,
      reversed:false, measureMode:false,
    };
    if(measureState.active && measureState.ptA && measureState.ptB) {
      const start = Math.min(measureState.ptA.idx, measureState.ptB.idx);
      const end = Math.max(measureState.ptA.idx, measureState.ptB.idx);
      const reversed = measureState.ptA.idx > measureState.ptB.idx;
      points = main.track.slice(start, end + 1);
      if(reversed) points = points.slice().reverse();
      Object.assign(layout, {kmFromZero:true, measureMode:true, trackBreaks:trackBreaksInRange(main.track_breaks, start, end, reversed)});
      Object.assign(annotations, {segIdxStart:start, segIdxEnd:end, reversed, measureMode:true});
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id && dayPreviewState.iStart != null && dayPreviewState.iEnd != null) {
      const start = Math.min(dayPreviewState.iStart, dayPreviewState.iEnd);
      const end = Math.max(dayPreviewState.iStart, dayPreviewState.iEnd);
      points = main.track.slice(start, end + 1);
      Object.assign(layout, {kmFromZero:true, measureMode:true, trackBreaks:trackBreaksInRange(main.track_breaks, start, end, false)});
      Object.assign(annotations, {segIdxStart:start, segIdxEnd:end, reversed:false, measureMode:true});
    }
    return {points, layout, annotations};
  }

  function renderNow():void {
    if(!canvas) return;
    const main = selectors.primaryTrail(projectSelectors.trails());
    if(!main?.track?.length) {
      renderer?.clear({width:canvas.offsetWidth || 340, height:canvas.offsetHeight || 140, dpr:window.devicePixelRatio || 1});
      data = null;
      renderRuntimeStats.elevation = {sourcePoints:0, renderedPoints:0};
      return;
    }
    const stack = buildStackContext(main);
    const targetHeight = app.estimateElevationPanelHeightForPoints(stack.points, {
      ...stack.layout, ...stack.annotations, width:canvas.offsetWidth || 340,
      campLabel:t('elev.anno.camp'), measureText:renderer?.measureText,
    });
    const bar:any = document.getElementById('elev-bar');
    if(bar && Math.abs(bar.offsetHeight - targetHeight) > 2) {
      bar.style.height = `${targetHeight}px`;
      void bar.offsetHeight;
    }
    if(measureState.active && measureState.ptA && measureState.ptB) {
      draw(stack.points, '#3F5238', t('elev.measure'), {...stack.layout, ...stack.annotations});
    } else if(dayPreviewState.active && dayPreviewState.trailId === main.id) {
      draw(stack.points, '#fbbf24', `D${dayPreviewState.day} · ${t('elev.measure')}`, {...stack.layout, ...stack.annotations});
    } else {
      draw(main.track, main.color, `${main.name || t('mini.primary')} · ${t('elev.title')}`, {
        trackBreaks:main.track_breaks, waypoints:main.waypoints,
        segIdxStart:0, segIdxEnd:main.track.length - 1, reversed:false,
      });
    }
  }

  function refresh():void { invalidateChart(); }

  function hitTest(event:any):any {
    if(!data) return null;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const left = data.PL ?? 44;
    const right = data.PR ?? 16;
    const width = rect.width - left - right;
    if(mouseX < left || mouseX > left + width) return null;
    const km = data.km || [];
    const points = data.pts || [];
    if(!km.length || !points.length) return null;
    const target = km[0] + (km[km.length - 1] - km[0]) * ((mouseX - left) / width);
    let low = 0;
    let high = km.length - 1;
    while(low < high - 1) {
      const middle = (low + high) >> 1;
      if(km[middle] < target) low = middle;
      else high = middle;
    }
    const index = Math.abs(km[low] - target) < Math.abs(km[high] - target) ? low : high;
    return {index, point:points[index], mouseX};
  }

  if(canvas) {
    canvas.style.pointerEvents = 'auto';
    canvas.addEventListener('mousemove', (event:any) => {
      const hit = hitTest(event);
      if(!hit) { if(crosshair) crosshair.style.display = 'none'; if(tip) tip.style.display = 'none'; return; }
      const {point, mouseX} = hit;
      if(crosshair) { crosshair.style.display = 'block'; crosshair.style.left = `${mouseX}px`; }
      if(tip) {
        tip.style.display = 'block';
        tip.style.left = `${Math.max(4, Math.min(mouseX + 8, canvas.getBoundingClientRect().width - 210))}px`;
        tip.innerHTML = `<b>${point[3] !== undefined ? `${point[3]}km` : ''}</b> · ${point[2]}m · ↑<b>${point[4]}m</b><span class="elev-tip-coordinate">${formatTrackPointCoordinates(point)}</span>`;
      }
    });
    canvas.addEventListener('mouseleave', () => {
      if(crosshair) crosshair.style.display = 'none';
      if(tip) tip.style.display = 'none';
    });
    canvas.addEventListener('click', (event:any) => {
      const point = hitTest(event)?.point;
      if(!point || point[0] == null) return;
      if(clickMarker) { clearTimeout(clickMarker._autoRemove); clickMarker.remove(); }
      const latLng = [point[0], point[1]];
      clickMarker = L.circleMarker(latLng, {
        radius:7, color:'#fff', weight:2, fillColor:data?.color || '#fbbf24', fillOpacity:1, pane:'tooltipPane',
      }).addTo(map);
      const text = `<b>${point[3] !== undefined ? `${point[3]}km · ` : ''}${Math.round(point[2])}m</b><br><span class="track-point-coordinate">${formatTrackPointCoordinates(point)}</span>`;
      clickMarker.bindTooltip(text, {permanent:true, direction:'top', offset:[0,-8], className:'measure-tip'}).openTooltip();
      map.panTo(latLng, {animate:true, duration:.4});
      clickMarker._autoRemove = window.setTimeout(() => { clickMarker?.remove(); clickMarker = null; }, 8000);
    });
  }
  window.addEventListener('resize', () => { if(data) refresh(); });

  return Object.freeze({
    canvas,
    renderer,
    draw,
    renderNow,
    refresh,
    updateBadges,
    get data() { return data; },
  });
}
