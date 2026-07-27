export interface StitchRuntimeDependencies {
  document: Document;
  window: Window;
  leaflet: any;
  map: any;
  [name: string]: any;
}

export interface StitchRuntime {
  readonly state: any;
  readonly layer: any;
  render(): void;
  requestExit(force?: boolean): Promise<boolean>;
  command(): Promise<boolean>;
}

/** Owns the complete trail-composer session, Leaflet overlay, and panel orchestration. */
export function createStitchRuntime(dependencies: StitchRuntimeDependencies): StitchRuntime {
  const {
    document, window, leaflet:L, map, haversine, splitTrackByBreaks,
    buildTrackLatLngSegments, escapeUiText, createPrimaryTrackDragSnapper,
    scheduleRuntimeInteractionFrame, dispatchRuntimeInteraction, commandRegistry,
    studioDialogs, interactionManager, selectors, projectSelectors,
    beginRuntimeInteraction, setRuntimeInteractionPhase, fitWorkspaceBounds,
    stitchTrails, generateNextTrailId, recordProjectEdit, fileImportController,
    showToast, requestSegmentExit, trailGroup, getCurrentLang,
  } = dependencies;
  const layer = L.layerGroup().addTo(map);
  const palette = ['#1E6F50','#D96C4A','#5577B8','#8A6BBE','#C45D83','#B7791F','#2B7A78','#9B4A3C'];
  const state = {active:false, parts:[] as any[], selectedPartId:null as string | null, dirty:false};
  let sequence = 0;
  const isZh = () => getCurrentLang() === 'zh';

  function createPart(trail: any): any {
    return {
      id:`stitch-part-${++sequence}`,
      trail,
      startIndex:0,
      endIndex:Math.max(1, trail.track.length - 1),
      reversed:false,
    };
  }

  function endpointIndex(part: any, label: string): number {
    if(label === 'A') return part.reversed ? part.endIndex : part.startIndex;
    return part.reversed ? part.startIndex : part.endIndex;
  }

  function endpoint(part: any, label: string): any {
    return part.trail.track[endpointIndex(part, label)];
  }

  function distanceKm(part: any): number {
    const start = part.trail.track[part.startIndex];
    const end = part.trail.track[part.endIndex];
    if(Number.isFinite(start?.[3]) && Number.isFinite(end?.[3])) {
      return Math.max(0, Number(end[3]) - Number(start[3]));
    }
    let distanceM = 0;
    const breaks = new Set(part.trail.track_breaks || []);
    for(let index = part.startIndex + 1; index <= part.endIndex; index += 1) {
      if(breaks.has(index)) continue;
      const previous = part.trail.track[index - 1];
      const point = part.trail.track[index];
      distanceM += haversine(previous[0], previous[1], point[0], point[1]);
    }
    return distanceM / 1000;
  }

  function junctions(): any[] {
    const result = [];
    for(let index = 1; index < state.parts.length; index += 1) {
      const from = endpoint(state.parts[index - 1], 'B');
      const to = endpoint(state.parts[index], 'A');
      if(!from || !to) continue;
      const distanceM = haversine(from[0], from[1], to[0], to[1]);
      result.push({index, distanceM, connected:distanceM <= 5, from, to});
    }
    return result;
  }

  function applyEndpoint(part: any, label: string, hit: any): boolean {
    if(!part || !hit || !Number.isInteger(hit.idx)) return false;
    const index = Math.max(0, Math.min(part.trail.track.length - 1, hit.idx));
    if(label === 'A') {
      if(part.reversed) part.endIndex = Math.max(part.startIndex + 1, index);
      else part.startIndex = Math.min(part.endIndex - 1, index);
    } else if(part.reversed) part.startIndex = Math.min(part.endIndex - 1, index);
    else part.endIndex = Math.max(part.startIndex + 1, index);
    state.dirty = true;
    return true;
  }

  const endpointKey = (part: any, label: string) => `${part.id}:${label}`;

  function endpointOffsets(parts: any[]): Map<string, {x:number; y:number}> {
    const entries = parts.flatMap((part, index) => ['A','B'].map(label => ({
      key:endpointKey(part, label), index, point:endpoint(part, label),
    }))).filter(entry => entry.point);
    const offsets = new Map(entries.map(entry => [entry.key, {x:0, y:0}]));
    const assigned = new Set<string>();
    for(const entry of entries) {
      if(assigned.has(entry.key)) continue;
      const group = entries.filter(candidate => !assigned.has(candidate.key)
        && haversine(entry.point[0], entry.point[1], candidate.point[0], candidate.point[1]) <= 20);
      group.forEach(candidate => assigned.add(candidate.key));
      if(group.length < 2) continue;
      const radius = group.length === 2 ? 26 : 32;
      group.sort((left, right) => left.index - right.index || left.key.localeCompare(right.key));
      group.forEach((candidate, index) => {
        const angle = -Math.PI / 2 + Math.PI * 2 * index / group.length;
        offsets.set(candidate.key, {x:Math.round(Math.cos(angle) * radius), y:Math.round(Math.sin(angle) * radius)});
      });
    }
    return offsets;
  }

  function endpointIcon(label: string, color: string, order: number, active: boolean, offset = {x:0, y:0}): any {
    return L.divIcon({
      className:'',
      html:`<div class="stitch-endpoint-marker${active ? ' is-active' : ''}" style="--stitch-color:${color};--stitch-offset-x:${offset.x}px;--stitch-offset-y:${offset.y}px">${order}${label}</div>`,
      iconSize:[44,44], iconAnchor:[22,22],
    });
  }

  function applySelection(partId: string): void {
    state.selectedPartId = partId;
    document.querySelectorAll<HTMLElement>('.stitch-part-card').forEach(card => {
      card.classList.toggle('is-active', card.dataset.partId === partId);
    });
    layer.eachLayer((item: any) => {
      if(!item._stitchPartId) return;
      const active = item._stitchPartId === partId;
      if(item._stitchRole === 'source' && item.setStyle) item.setStyle({weight:active ? 3 : 2, opacity:active ? .42 : .1});
      else if(item._stitchRole === 'halo' && item.setStyle) {
        item.setStyle({weight:active ? 13 : 8, opacity:active ? .72 : 0});
        if(active) item.bringToFront?.();
      } else if(item._stitchRole === 'selection' && item.setStyle) {
        item.setStyle({weight:active ? 8 : 3.5, opacity:active ? 1 : .3});
        if(active) item.bringToFront?.();
      } else if(item._stitchRole === 'endpoint') {
        item.setOpacity?.(active ? 1 : .78);
        item.setZIndexOffset?.(active ? 3000 : 700 + (item._stitchOrder || 0));
        item._icon?.querySelector('.stitch-endpoint-marker')?.classList.toggle('is-active', active);
      }
    });
  }

  function renderMap(): void {
    layer.clearLayers();
    if(!state.active) return;
    const paneName = 'stitch-endpoints';
    const pane = map.getPane(paneName) || map.createPane(paneName);
    pane.style.zIndex = '760';
    const gaps = junctions();
    const offsets = endpointOffsets(state.parts);
    const parts = state.parts.map((part, index) => ({part, index}))
      .sort((left, right) => Number(left.part.id === state.selectedPartId) - Number(right.part.id === state.selectedPartId));
    parts.forEach(({part, index}) => {
      const color = palette[index % palette.length];
      const active = part.id === state.selectedPartId;
      const sourcePaths = splitTrackByBreaks(part.trail.track, part.trail.track_breaks)
        .map((segment: any[]) => segment.map(point => [point[0], point[1]]));
      const source = L.polyline(sourcePaths, {color, weight:active ? 3 : 2, opacity:active ? .42 : .1, dashArray:'4,7', interactive:false}).addTo(layer);
      source._stitchPartId = part.id; source._stitchRole = 'source';
      const selectedPaths = buildTrackLatLngSegments(part.trail.track, part.startIndex, part.endIndex, part.trail.track_breaks, 1400);
      const halo = L.polyline(selectedPaths, {color:'#FFFFFF', weight:active ? 13 : 8, opacity:active ? .72 : 0, lineCap:'round', lineJoin:'round', interactive:false}).addTo(layer);
      halo._stitchPartId = part.id; halo._stitchRole = 'halo';
      const selected = L.polyline(selectedPaths, {color, weight:active ? 8 : 3.5, opacity:active ? 1 : .3, lineCap:'round', lineJoin:'round', interactive:true}).addTo(layer);
      selected._stitchPartId = part.id; selected._stitchRole = 'selection';
      selected.bindTooltip(`${index + 1}. ${escapeUiText(part.trail.name)}`, {sticky:true});
      selected.on('click', (event: any) => {
        if(event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
        state.selectedPartId = part.id;
        render();
      });
      if(L.polylineDecorator && L.Symbol?.arrowHead) {
        L.polylineDecorator(selected, {patterns:[{offset:'12%', repeat:'24%', symbol:L.Symbol.arrowHead({pixelSize:7, polygon:false, pathOptions:{color, weight:2, opacity:.9}})}]}).addTo(layer);
      }
      for(const label of ['A','B']) {
        const point = endpoint(part, label);
        if(!point) continue;
        const guide = L.polyline([], {color, weight:2, opacity:0, dashArray:'3,6', interactive:false}).addTo(layer);
        guide._stitchPartId = part.id; guide._stitchRole = 'snap-guide';
        const target = L.circleMarker([point[0], point[1]], {radius:9, color:'#FFFFFF', weight:3, opacity:0, fillColor:color, fillOpacity:0, interactive:false}).addTo(layer);
        target._stitchPartId = part.id; target._stitchRole = 'snap-target';
        const marker = L.marker([point[0], point[1]], {
          draggable:true, autoPan:true, pane:paneName,
          icon:endpointIcon(label, color, index + 1, active, offsets.get(endpointKey(part, label))),
          zIndexOffset:active ? 3000 : 700 + index,
        }).addTo(layer);
        marker._stitchPartId = part.id; marker._stitchRole = 'endpoint'; marker._stitchEndpoint = label; marker._stitchOrder = index;
        marker.setOpacity(active ? 1 : .78);
        marker.bindTooltip(`${index + 1}${label} · ${escapeUiText(part.trail.name)}`, {direction:'top', offset:[0,-16]});
        const snapper = createPrimaryTrackDragSnapper(marker, {
          trail:part.trail, getCenterIdx:() => endpointIndex(part, label), globalSearch:true, snapMarker:false,
          scheduleFrame:(callback: any) => scheduleRuntimeInteractionFrame('stitch', callback),
          onSnap:(hit: any, pointer: any) => {
            target.setLatLng([hit.point[0], hit.point[1]]).setStyle({opacity:1, fillOpacity:.24});
            guide.setLatLngs([[pointer.lat, pointer.lng], [hit.point[0], hit.point[1]]]).setStyle({opacity:.78});
          },
        });
        marker.on('dragstart', () => {
          applySelection(part.id);
          marker._icon?.querySelector('.stitch-endpoint-marker')?.classList.add('is-dragging');
          dispatchRuntimeInteraction('stitch', {type:'drag-start', partId:part.id, endpoint:label});
        });
        marker.on('drag', (event: any) => snapper.schedule(event));
        marker.on('dragend', (event: any) => {
          const hit = snapper.resolve(event.target.getLatLng());
          snapper.cancel();
          marker._icon?.querySelector('.stitch-endpoint-marker')?.classList.remove('is-dragging');
          dispatchRuntimeInteraction('stitch', {type:'drag-end', partId:part.id, endpoint:label, hit});
        });
        marker.on('click', (event: any) => {
          if(event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          state.selectedPartId = part.id;
          render();
        });
      }
    });
    gaps.forEach(gap => {
      if(gap.connected) return;
      L.polyline([[gap.from[0], gap.from[1]], [gap.to[0], gap.to[1]]], {color:'#A66A17', weight:2, opacity:.7, dashArray:'3,8', interactive:true})
        .bindTooltip(isZh() ? `断点 ${Math.round(gap.distanceM)} m（不计入里程）` : `Gap ${Math.round(gap.distanceM)} m (excluded)`, {sticky:true})
        .addTo(layer);
    });
  }

  function actionButton(label: string, title: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'stitch-part-action'; button.textContent = label;
    button.title = title; button.setAttribute('aria-label', title);
    button.addEventListener('click', event => { event.stopPropagation(); action(); });
    return button;
  }

  function movePart(partId: string, direction: number): void {
    const index = state.parts.findIndex(part => part.id === partId);
    const target = index + direction;
    if(index < 0 || target < 0 || target >= state.parts.length) return;
    const [part] = state.parts.splice(index, 1);
    state.parts.splice(target, 0, part);
    state.dirty = true;
    render();
  }

  function renderPanel(): void {
    const panel = document.getElementById('stitch-panel');
    const list = document.getElementById('stitch-parts');
    const summary = document.getElementById('stitch-summary');
    if(!panel || !list || !summary) return;
    panel.classList.toggle('is-open', state.active);
    if(!state.active) return;
    list.replaceChildren();
    const allJunctions = junctions();
    const gaps = new Map(allJunctions.filter(item => !item.connected).map(item => [item.index, item]));
    state.parts.forEach((part, index) => {
      const color = palette[index % palette.length];
      const card = document.createElement('article');
      card.className = 'stitch-part-card'; card.classList.toggle('is-active', part.id === state.selectedPartId);
      card.style.setProperty('--stitch-color', color); card.draggable = true; card.dataset.partId = part.id;
      const order = document.createElement('span'); order.className = 'stitch-part-order'; order.textContent = String(index + 1);
      const copy = document.createElement('div'); copy.className = 'stitch-part-copy';
      const title = document.createElement('strong'); title.textContent = `${isZh() ? '片段' : 'Part'} ${index + 1} · ${part.trail.name}`;
      const meta = document.createElement('small'); meta.textContent = `${part.reversed ? 'B → A' : 'A → B'} · ${distanceKm(part).toFixed(2)} km · ${part.startIndex}–${part.endIndex}`;
      copy.append(title, meta);
      if(part.id === state.selectedPartId) {
        const editing = document.createElement('span'); editing.className = 'stitch-part-editing'; editing.textContent = isZh() ? '正在调整' : 'Editing'; copy.append(editing);
      }
      const actions = document.createElement('div'); actions.className = 'stitch-part-actions';
      actions.append(
        actionButton('↑', isZh() ? '上移' : 'Move up', () => movePart(part.id, -1)),
        actionButton('↓', isZh() ? '下移' : 'Move down', () => movePart(part.id, 1)),
        actionButton('⇄', isZh() ? '反向' : 'Reverse', () => { part.reversed = !part.reversed; state.dirty = true; render(); }),
        actionButton('↔', isZh() ? '恢复完整轨迹' : 'Use full trail', () => { part.startIndex = 0; part.endIndex = part.trail.track.length - 1; state.dirty = true; render(); }),
        actionButton('⧉', isZh() ? '复制片段' : 'Duplicate part', () => {
          const duplicate = {...part, id:`stitch-part-${++sequence}`}; state.parts.splice(index + 1, 0, duplicate);
          state.selectedPartId = duplicate.id; state.dirty = true; render();
        }),
        actionButton('×', isZh() ? '删除片段' : 'Delete part', () => {
          state.parts.splice(index, 1); state.selectedPartId = state.parts[Math.min(index, state.parts.length - 1)]?.id || null;
          state.dirty = true; render();
        }),
      );
      card.append(order, copy, actions);
      const gap:any = gaps.get(index);
      if(gap) {
        const label = document.createElement('span'); label.className = 'stitch-part-gap';
        label.textContent = isZh() ? `前一段后有 ${Math.round(gap.distanceM)} m 断点，不连接且不计入统计` : `${Math.round(gap.distanceM)} m gap before this part; excluded from stats`;
        card.append(label);
      }
      card.addEventListener('click', () => { state.selectedPartId = part.id; render(); });
      card.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', part.id));
      card.addEventListener('dragover', event => event.preventDefault());
      card.addEventListener('drop', event => {
        event.preventDefault();
        const sourceId = event.dataTransfer?.getData('text/plain');
        const sourceIndex = state.parts.findIndex(item => item.id === sourceId);
        const targetIndex = state.parts.findIndex(item => item.id === part.id);
        if(sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
        const [moved] = state.parts.splice(sourceIndex, 1); state.parts.splice(targetIndex, 0, moved);
        state.dirty = true; render();
      });
      list.append(card);
    });
    summary.replaceChildren();
    const chips:[string, boolean][] = [
      [`${state.parts.length} ${isZh() ? '个片段' : 'parts'}`, false],
      [`${state.parts.reduce((sum, part) => sum + distanceKm(part), 0).toFixed(2)} km`, false],
      [`${allJunctions.filter(item => !item.connected).length} ${isZh() ? '个断点' : 'gaps'}`, allJunctions.some(item => !item.connected)],
    ];
    chips.forEach(([value, gap]) => {
      const chip = document.createElement('span'); chip.className = `stitch-summary-chip${gap ? ' is-gap' : ''}`; chip.textContent = value; summary.append(chip);
    });
  }

  function render(): void { renderPanel(); renderMap(); }

  function cleanup(): void {
    state.active = false; state.parts = []; state.selectedPartId = null; state.dirty = false;
    layer.clearLayers();
    document.getElementById('stitch-panel')?.classList.remove('is-open');
    document.documentElement.classList.remove('stitch-editing');
    commandRegistry.notifyChanged();
  }

  async function requestExit(force = false): Promise<boolean> {
    if(!state.active) return true;
    if(!force && state.dirty) {
      const confirmed = await studioDialogs.confirm({
        title:isZh() ? '退出轨迹拼接？' : 'Exit trail composer?',
        message:isZh() ? '当前片段范围、方向或顺序尚未生成新轨迹。' : 'The current ranges, directions, and order have not been created.',
        confirmLabel:isZh() ? '放弃并退出' : 'Discard and exit', cancelLabel:isZh() ? '继续编辑' : 'Keep editing', danger:true,
      });
      if(!confirmed) return false;
    }
    if(interactionManager.current.kind === 'stitch') interactionManager.cancel('stitch-exit');
    else cleanup();
    return true;
  }

  function handleInteraction(event: any, session: any): void {
    const part = state.parts.find(item => item.id === event.partId);
    if(!part) return;
    if(event.type === 'drag-start') session.setPhase('dragging');
    else if(event.type === 'drag-end') { applyEndpoint(part, event.endpoint, event.hit); session.setPhase('editing'); render(); }
  }

  async function enter(trails: any[]): Promise<boolean> {
    const ownerTrail = selectors.primaryTrail(projectSelectors.trails()) || trails[0];
    if(interactionManager.current.kind !== 'idle') interactionManager.cancel('switch-stitch');
    state.parts = trails.map(createPart); state.selectedPartId = state.parts[0]?.id || null; state.dirty = false;
    const session = beginRuntimeInteraction('stitch', 'editing', ownerTrail, {onEvent:handleInteraction, onCancel:cleanup});
    if(!session) return false;
    state.active = true; document.documentElement.classList.add('stitch-editing');
    const nameInput = document.getElementById('stitch-name') as HTMLInputElement | null;
    if(nameInput) nameInput.value = isZh() ? '拼接轨迹' : 'Stitched trail';
    const error = document.getElementById('stitch-error'); if(error) error.textContent = '';
    render();
    const points = trails.flatMap(trail => trail.track.map((point: any) => [point[0], point[1]]));
    if(points.length) {
      await new Promise<void>(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      map.invalidateSize({pan:false, animate:false});
      const options = window.innerWidth <= 760
        ? {paddingTopLeft:[36,36], paddingBottomRight:[36,Math.min(360, Math.round(window.innerHeight * .42))]}
        : {paddingTopLeft:[50,50], paddingBottomRight:[430,50]};
      await fitWorkspaceBounds(L.latLngBounds(points), options, {source:'stitch-workbench'});
    }
    return true;
  }

  async function commit(): Promise<boolean> {
    const error = document.getElementById('stitch-error');
    const name = (document.getElementById('stitch-name') as HTMLInputElement | null)?.value.trim();
    if(state.parts.length < 2) { if(error) error.textContent = isZh() ? '至少保留两个轨迹片段。' : 'Keep at least two trail parts.'; return false; }
    if(!name) { if(error) error.textContent = isZh() ? '请输入新轨迹名称。' : 'Enter a name for the new trail.'; return false; }
    if(!setRuntimeInteractionPhase('stitch', 'committing')) return false;
    const trail = stitchTrails(state.parts.map(part => ({trail:part.trail, startIndex:part.startIndex, endIndex:part.endIndex, reversed:part.reversed})), {
      id:generateNextTrailId(), name, seamToleranceM:5,
    });
    const gapCount = trail.track_breaks.length;
    interactionManager.cancel('stitch-committed');
    const result = recordProjectEdit('生成拼接轨迹', 'Create stitched trail', () => fileImportController.addTrail(trail));
    if(result.status !== 'added') { showToast(isZh() ? '生成结果与已有轨迹重复' : 'The stitched result duplicates an existing trail', 'info'); return false; }
    fileImportController.finalizeImport(1);
    showToast(isZh() ? `已生成「${trail.name}」· ${trail.stats.distance_km.toFixed(1)} km · ${gapCount} 个断点` : `Created “${trail.name}” · ${trail.stats.distance_km.toFixed(1)} km · ${gapCount} gaps`);
    return true;
  }

  async function command(): Promise<boolean> {
    if(state.active) return true;
    if(interactionManager.current.kind === 'segment' && !await requestSegmentExit('switch-stitch')) return false;
    if(projectSelectors.trails().length < 2) {
      await studioDialogs.info({title:isZh() ? '无法拼接轨迹' : 'Cannot stitch trails', message:isZh() ? '至少需要两条已有轨迹。' : 'At least two existing trails are required.'});
      return false;
    }
    const requested = await studioDialogs.openCustom({
      title:isZh() ? '选择拼接来源' : 'Choose source trails',
      message:isZh() ? '从 0 开始选择两条或更多路线，下一步将在地图中调整每段范围、方向和顺序。' : 'Start with no selection, choose two or more trails, then edit ranges, directions, and order on the map.',
      size:'wide',
      render(context: any) {
        const list = document.createElement('div'); list.className = 'stitch-trail-list stitch-source-list';
        for(const trail of projectSelectors.trails()) {
          const row = document.createElement('label'); row.className = 'stitch-trail-row stitch-source-row'; row.dataset.trailId = trail.id;
          const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'stitch-trail-check'; checkbox.checked = false;
          const copy = document.createElement('span'); copy.className = 'stitch-trail-copy';
          const title = document.createElement('strong'); title.textContent = trail.name || trail.id;
          const meta = document.createElement('small'); meta.textContent = `${trailGroup(trail)} · ${Number(trail.stats?.distance_km || 0).toFixed(1)} km`;
          copy.append(title, meta); row.append(checkbox, copy); list.append(row);
        }
        const error = document.createElement('p'); error.className = 'workbench-dialog__error'; error.setAttribute('role', 'alert');
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'workbench-dialog__button workbench-dialog__button--secondary'; cancel.textContent = isZh() ? '取消' : 'Cancel'; cancel.addEventListener('click', context.cancel);
        const next = document.createElement('button'); next.type = 'submit'; next.className = 'workbench-dialog__button workbench-dialog__button--primary'; next.textContent = isZh() ? '进入地图编辑' : 'Edit on map';
        context.form.addEventListener('submit', (event: Event) => {
          event.preventDefault();
          const ids = [...list.querySelectorAll<HTMLInputElement>('.stitch-trail-check:checked')]
            .map(input => input.closest<HTMLElement>('.stitch-trail-row')?.dataset.trailId).filter(Boolean);
          if(ids.length < 2) { error.textContent = isZh() ? '请至少选择两条轨迹。' : 'Select at least two trails.'; return; }
          context.close({trailIds:ids});
        });
        context.body.append(list, error); context.actions.append(cancel, next);
      },
    });
    if(!requested) return false;
    const trails = requested.trailIds.map((id: string) => projectSelectors.trails().find((trail: any) => trail.id === id)).filter(Boolean);
    return trails.length >= 2 && enter(trails);
  }

  const panel = document.getElementById('stitch-panel');
  if(panel) { L.DomEvent.disableClickPropagation(panel); L.DomEvent.disableScrollPropagation(panel); }
  document.getElementById('stitch-close')?.addEventListener('click', () => void requestExit());
  document.getElementById('stitch-cancel')?.addEventListener('click', () => void requestExit());
  document.getElementById('stitch-commit')?.addEventListener('click', () => void commit());

  return Object.freeze({state, layer, render, requestExit, command});
}
