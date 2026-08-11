import type {RuntimeContext} from '../../app/runtime/context.ts';
import type {InteractionSessionLike} from '../../app/runtime/interaction-owner.ts';
import {
  createWaypointController,
  type WaypointController,
  type WaypointControllerState,
  type WaypointTrail,
} from './controller.ts';

export interface WaypointRuntimeDependencies {
  document: Document;
  leaflet: any;
  map: any;
  dialogs: any;
  context: RuntimeContext<WaypointTrail>;
  selectors: any;
  projectSelectors: any;
  language(): string;
  translate(key: string): string;
  tagColors: Record<string, string>;
  iconForTag(tag: unknown): string;
  iconMarkup(tag: unknown): string;
  nearestPrimary(lat: number, lng: number): any;
  distance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  markRevision(trail: WaypointTrail): unknown;
  renderWaypoints(): void;
  renderFilters(): void;
  renderDays(): void;
  persist(): void;
  notify(message: string, type?: string): void;
  recordEdit(zhLabel: string, enLabel: string, mutation: () => unknown): unknown;
  beginInteraction(
    kind: 'waypoint',
    phase: string,
    owner: any,
    options: {onEvent(event: object, session: InteractionSessionLike): void; onCancel(options: any): void},
  ): InteractionSessionLike | null;
  cancelInteraction(kind: 'waypoint', reason?: string): boolean;
  dispatchInteraction(kind: 'waypoint', event: Record<string, unknown>): boolean;
  ownerIsCurrent(session?: InteractionSessionLike): boolean;
}

export interface WaypointRuntime {
  readonly controller: WaypointController;
  readonly state: Readonly<WaypointControllerState>;
  nextId(trail: WaypointTrail): number;
  addManualWaypointAt(latlng: any, options?: {requireNear?: boolean; isCurrent?: (() => boolean) | null}): Promise<boolean>;
  enter(options?: {announce?: boolean}): InteractionSessionLike | null;
  exit(options?: {fromManager?: boolean; reason?: string}): void;
  dispatchTransientTap(latlng: any, source: string): boolean;
}

/** Owns manual-waypoint dialogs, map gestures, and the unified interaction session. */
export function createWaypointRuntime(dependencies: WaypointRuntimeDependencies): WaypointRuntime {
  const {
    document, leaflet:L, map, dialogs, context, selectors, projectSelectors,
    language, translate:t, tagColors, iconForTag, iconMarkup, nearestPrimary,
    distance, markRevision, renderWaypoints, renderFilters, renderDays, persist,
    notify, recordEdit, beginInteraction, cancelInteraction, dispatchInteraction,
    ownerIsCurrent,
  } = dependencies;

  const controller = createWaypointController(context, {
    iconForTag:tag => iconForTag(tag),
    markRevision,
    renderWaypoints,
    renderFilters,
    renderDays,
    persist,
    notify:message => notify(message),
  });

  const findAnchor = (latlng: any, requireNear = false): any => {
    const main = selectors.primaryTrail(projectSelectors.trails());
    if(!main?.track?.length) return null;
    const hit = nearestPrimary(latlng.lat, latlng.lng);
    if(hit) return hit;
    if(requireNear) return null;
    let bestIndex = 0;
    let bestDistance = Infinity;
    for(let index = 0; index < main.track.length; index += 1) {
      const point = main.track[index];
      const candidateDistance = distance(latlng.lat, latlng.lng, point[0], point[1]);
      if(candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    }
    return {idx:bestIndex, point:main.track[bestIndex], dist:bestDistance, trail:main};
  };

  const readPhoto = (file?: File): Promise<string> => new Promise((resolve, reject) => {
    if(!file) {
      resolve('');
      return;
    }
    const allowedTypes = new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
    if(!allowedTypes.has(file.type.toLowerCase())) {
      reject(new Error(language() === 'zh'
        ? '请选择 PNG、JPEG、GIF、WebP 或 AVIF 图片'
        : 'Choose a PNG, JPEG, GIF, WebP, or AVIF image'));
      return;
    }
    if(file.size > 5 * 1024 * 1024) {
      reject(new Error(language() === 'zh' ? '图片不能超过 5 MB' : 'Image must be 5 MB or smaller'));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''));
    reader.addEventListener('error', () => reject(new Error(language() === 'zh' ? '图片读取失败' : 'Could not read image')));
    reader.readAsDataURL(file);
  });

  const openEditor = (): Promise<any> => {
    const isZh = language() === 'zh';
    return dialogs.openCustom({
      title:isZh ? '新增标注点' : 'Add waypoint',
      size:'wide',
      initialFocus:'#manual-waypoint-name',
      render:({form, body, actions, close, cancel}: any) => {
        const createField = (labelText: string, control: HTMLElement): void => {
          const label = document.createElement('label');
          label.className = 'workbench-dialog__field';
          const caption = document.createElement('span');
          caption.className = 'workbench-dialog__label';
          caption.textContent = labelText;
          label.append(caption, control);
          body.append(label);
        };

        const name = document.createElement('input');
        name.id = 'manual-waypoint-name';
        name.className = 'workbench-dialog__input';
        name.type = 'text';
        name.required = true;
        name.maxLength = 80;
        name.placeholder = isZh ? '例如：营地、水源、岔路口' : 'For example: camp, water, junction';
        createField(isZh ? '名称' : 'Name', name);

        const tag = document.createElement('select');
        tag.id = 'manual-waypoint-tag';
        tag.className = 'workbench-dialog__input workbench-dialog__select waypoint-type-select';
        ['other','camp','water','supply','pass','fork','warn','shelter','village','bridge','river','start','end'].forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = t(`tag.${value}`) || value;
          tag.append(option);
        });
        tag.value = 'other';
        const tagControl = document.createElement('div');
        tagControl.className = 'waypoint-type-select-control';
        const tagPreview = document.createElement('span');
        tagPreview.className = 'waypoint-type-select-preview';
        tagPreview.setAttribute('aria-hidden', 'true');
        const updateTagPreview = (): void => {
          tagPreview.style.color = tagColors[tag.value] || '#64748b';
          tagPreview.innerHTML = iconMarkup(tag.value);
        };
        tag.addEventListener('change', updateTagPreview);
        tagControl.append(tagPreview, tag);
        createField(isZh ? '图标与类型' : 'Icon and type', tagControl);
        updateTagPreview();

        const description = document.createElement('textarea');
        description.id = 'manual-waypoint-description';
        description.className = 'workbench-dialog__input workbench-dialog__textarea';
        description.maxLength = 500;
        description.placeholder = isZh ? '可选：路况、补给、注意事项等' : 'Optional: conditions, supplies, notes';
        createField(isZh ? '文字描述（可选）' : 'Description (optional)', description);

        const photo = document.createElement('input');
        photo.id = 'manual-waypoint-photo';
        photo.className = 'workbench-dialog__file';
        photo.type = 'file';
        photo.accept = 'image/*';
        const preview = document.createElement('img');
        preview.className = 'workbench-dialog__image-preview';
        preview.alt = isZh ? '图片预览' : 'Image preview';
        preview.hidden = true;
        const photoWrap = document.createElement('div');
        photoWrap.className = 'workbench-dialog__photo-field';
        photoWrap.append(photo, preview);
        createField(isZh ? '图片（可选，最大 5 MB）' : 'Image (optional, 5 MB max)', photoWrap);

        const error = document.createElement('p');
        error.className = 'workbench-dialog__error';
        error.setAttribute('role', 'alert');
        body.append(error);
        let photoData = '';
        let photoRead = Promise.resolve('');
        photo.addEventListener('change', () => {
          error.textContent = '';
          photoData = '';
          preview.hidden = true;
          photoRead = readPhoto(photo.files?.[0]).then(data => {
            photoData = data;
            if(data) {
              preview.src = data;
              preview.hidden = false;
            }
            return data;
          }).catch((readError: Error) => {
            photo.value = '';
            error.textContent = readError.message;
            return '';
          });
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'workbench-dialog__button';
        cancelButton.textContent = isZh ? '取消' : 'Cancel';
        cancelButton.addEventListener('click', cancel);
        const addButton = document.createElement('button');
        addButton.type = 'submit';
        addButton.className = 'workbench-dialog__button workbench-dialog__button--primary';
        addButton.textContent = isZh ? '添加标注点' : 'Add waypoint';
        actions.append(cancelButton, addButton);

        form.addEventListener('submit', (event: Event) => {
          event.preventDefault();
          const cleanName = name.value.trim();
          if(!cleanName) {
            error.textContent = isZh ? '请输入标注点名称' : 'Enter a waypoint name';
            name.setAttribute('aria-invalid', 'true');
            name.focus();
            return;
          }
          addButton.disabled = true;
          void photoRead.then(() => close({
            name:cleanName,
            tag:tag.value,
            description:description.value.trim(),
            photo:photoData,
          }));
        });
        name.addEventListener('input', () => {
          error.textContent = '';
          name.removeAttribute('aria-invalid');
        });
      },
    });
  };

  const addManualWaypointAt = async (
    latlng: any,
    options: {requireNear?: boolean; isCurrent?: (() => boolean) | null} = {},
  ): Promise<boolean> => {
    const {requireNear = false, isCurrent = null} = options;
    const anchor = findAnchor(latlng, requireNear);
    if(!anchor) {
      notify(language() === 'zh' ? '请点击主轨迹附近（200m 内）' : 'Click within 200 m of the primary trail', 'error');
      return false;
    }
    const input = await openEditor();
    if(!input || (isCurrent && !isCurrent())) return false;
    return Boolean(recordEdit('添加标注点', 'Add waypoint', () => controller.addManualWaypoint({
      trailId:anchor.trail.id,
      trackIndex:anchor.idx,
      point:anchor.point,
    }, input)));
  };

  const handleInteractionEvent = (event: any, session: InteractionSessionLike): void => {
    if(event.type !== 'tap' || !session.setPhase('committing')) return;
    void addManualWaypointAt(event.latlng, {
      requireNear:event.requireNear !== false,
      isCurrent:() => session.isCurrent() && ownerIsCurrent(session),
    }).then(added => {
      if(!session.isCurrent()) return;
      if(added) session.cancel('committed');
      else if(event.transient) session.cancel('cancelled');
      else session.setPhase('select');
    }).catch(error => {
      console.error('Failed to add waypoint', error);
      if(session.isCurrent()) session.setPhase('select');
    });
  };

  function exitAddWaypointMode(options: {fromManager?: boolean; reason?: string} = {}): void {
    if(!options.fromManager && cancelInteraction('waypoint', options.reason || 'cancelled')) return;
    controller.exit();
    document.getElementById('add-waypoint-btn')?.classList.remove('on');
    map.getContainer().style.cursor = '';
  }

  function enterAddWaypointMode(options: {announce?: boolean} = {}): InteractionSessionLike | null {
    const main = selectors.primaryTrail(projectSelectors.trails());
    if(!main?.track?.length) {
      notify(language() === 'zh' ? '请先设置主轨迹' : 'Set a primary trail first', 'error');
      return null;
    }
    const session = beginInteraction('waypoint', 'select', main, {
      onEvent:handleInteractionEvent,
      onCancel:cancelOptions => exitAddWaypointMode(cancelOptions),
    });
    if(!controller.enter(main.id)) return null;
    document.getElementById('add-waypoint-btn')?.classList.add('on');
    map.getContainer().style.cursor = 'crosshair';
    if(options.announce !== false) {
      notify(language() === 'zh'
        ? '在主轨迹附近点击一次，添加手动标注点'
        : 'Click near the primary trail to add a waypoint');
    }
    return session;
  }

  function dispatchTransientWaypointTap(latlng: any, source: string): boolean {
    const session = enterAddWaypointMode({announce:false});
    if(!session) return false;
    return dispatchInteraction('waypoint', {
      type:'tap', source, latlng, requireNear:false, transient:true,
    });
  }

  map.on('contextmenu', (event: any) => {
    dispatchTransientWaypointTap(event.latlng, 'contextmenu');
  });
  let longPressTimer:ReturnType<typeof setTimeout> | null = null;
  const mapContainer = map.getContainer();
  mapContainer.addEventListener('touchstart', (event: TouchEvent) => {
    if(event.touches.length !== 1) return;
    const {clientX, clientY} = event.touches[0];
    longPressTimer = setTimeout(() => {
      const rect = mapContainer.getBoundingClientRect();
      const point = L.point(clientX - rect.left, clientY - rect.top);
      dispatchTransientWaypointTap(map.containerPointToLatLng(point), 'long-press');
    }, 600);
  }, {passive:true});
  const cancelLongPress = (): void => {
    if(longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
  };
  mapContainer.addEventListener('touchend', cancelLongPress, {passive:true});
  mapContainer.addEventListener('touchmove', cancelLongPress, {passive:true});

  return Object.freeze({
    controller,
    state:controller.state,
    nextId:(trail: WaypointTrail) => controller.nextId(trail),
    addManualWaypointAt,
    enter:enterAddWaypointMode,
    exit:exitAddWaypointMode,
    dispatchTransientTap:dispatchTransientWaypointTap,
  });
}
