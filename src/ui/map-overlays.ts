import {createWorkbenchIcon} from './icons.ts';
import {sanitizeHexColor, sanitizeImageSource} from './safe-content.ts';

export interface MapOverlayAnchor {
  clientX: number;
  clientY: number;
}

export interface MapTooltipRow {
  label: string;
  value: string;
  color?: string;
  coordinate?: boolean;
}

export interface WaypointCardModel {
  closeLabel?: string;
  iconHtml: string;
  label: string;
  meta: string;
  trailLabel?: string;
  trailName?: string;
  trailColor?: string;
  description?: string;
  photo?: string;
  photoHint?: string;
  photoCaption?: string;
}

export interface MapOverlayControllerOptions {
  document: Document;
  viewport: Pick<Window, 'innerWidth' | 'innerHeight'>;
  openImage: (source: string, caption: string) => void;
}

export interface MapOverlayController {
  showTooltip(rows: readonly MapTooltipRow[], anchor: MapOverlayAnchor): void;
  hideTooltip(): void;
  showWaypointCard(model: WaypointCardModel, anchor: MapOverlayAnchor): void;
  hideWaypointCard(): void;
  dispose(): void;
}

function createTextElement(
  document: Document,
  tag: 'div' | 'span' | 'b',
  className: string,
  text: string,
): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/** Owns the two transient map DOM surfaces and keeps runtime orchestration DOM-free. */
export function createMapOverlayController(options: MapOverlayControllerOptions): MapOverlayController {
  const tooltip = options.document.getElementById('tooltip');
  const waypointCard = options.document.getElementById('wp-photo-tip');
  if(!tooltip || !waypointCard) throw new Error('Map overlay elements are missing');
  let disposed = false;

  const hideTooltip = () => {
    tooltip.style.display = 'none';
  };

  const hideWaypointCard = () => {
    waypointCard.style.display = 'none';
    waypointCard.style.pointerEvents = 'none';
    waypointCard.replaceChildren();
  };

  const showTooltip = (rows: readonly MapTooltipRow[], anchor: MapOverlayAnchor) => {
    if(disposed) return;
    const fragments = rows.map(row => {
      const line = options.document.createElement('div');
      const label = createTextElement(options.document, 'span', 'lab', row.label);
      const value = createTextElement(
        options.document,
        'span',
        `val${row.coordinate ? ' coordinate' : ''}`,
        row.value,
      );
      line.className = 'row';
      if(row.color) value.style.color = sanitizeHexColor(row.color);
      line.append(label, value);
      return line;
    });
    tooltip.replaceChildren(...fragments);
    tooltip.style.display = 'block';
    const rect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${clamp(anchor.clientX, rect.width / 2 + 10, options.viewport.innerWidth - rect.width / 2 - 10)}px`;
    tooltip.style.top = `${clamp(anchor.clientY, rect.height + 12, options.viewport.innerHeight - 12)}px`;
  };

  const showWaypointCard = (model: WaypointCardModel, anchor: MapOverlayAnchor) => {
    if(disposed) return;
    waypointCard.replaceChildren();

    const close = options.document.createElement('button');
    close.type = 'button';
    close.className = 'waypoint-card__close';
    close.setAttribute('aria-label', model.closeLabel || 'Close waypoint details');
    close.appendChild(createWorkbenchIcon(options.document, 'x', {size:15}));
    close.addEventListener('click', event => {
      event.stopPropagation();
      hideWaypointCard();
    });
    waypointCard.appendChild(close);

    if(model.trailName) {
      const trail = createTextElement(
        options.document,
        'div',
        'waypoint-card__trail',
        `${model.trailLabel || ''}${model.trailLabel ? ': ' : ''}${model.trailName}`,
      );
      trail.style.color = sanitizeHexColor(model.trailColor, '#C7D6CC');
      waypointCard.appendChild(trail);
    }

    const photo = sanitizeImageSource(model.photo) || '';
    if(photo) {
      const image = options.document.createElement('img');
      image.className = 'waypoint-card__image';
      image.src = photo;
      image.alt = model.label;
      image.loading = 'lazy';
      image.addEventListener('error', () => { image.hidden = true; });
      image.addEventListener('click', event => {
        event.stopPropagation();
        options.openImage(photo, model.photoCaption || model.label);
      });
      waypointCard.appendChild(image);
    }

    const title = options.document.createElement('div');
    const icon = options.document.createElement('span');
    title.className = `waypoint-card-title waypoint-card__title${photo ? ' has-photo' : ''}`;
    icon.className = 'waypoint-card__icon';
    icon.innerHTML = model.iconHtml;
    title.append(
      icon,
      createTextElement(options.document, 'b', 'waypoint-card__name', model.label),
      createTextElement(options.document, 'span', 'waypoint-card__meta', model.meta),
    );
    waypointCard.appendChild(title);

    if(model.description) {
      waypointCard.appendChild(createTextElement(
        options.document,
        'div',
        'waypoint-card__description',
        model.description,
      ));
    }
    if(photo && model.photoHint) {
      waypointCard.appendChild(createTextElement(
        options.document,
        'div',
        'waypoint-card__hint',
        model.photoHint,
      ));
    }

    waypointCard.style.display = 'block';
    waypointCard.style.pointerEvents = 'auto';
    const rect = waypointCard.getBoundingClientRect();
    const left = clamp(anchor.clientX - rect.width / 2, 10, options.viewport.innerWidth - rect.width - 10);
    const top = clamp(anchor.clientY + 16, 10, options.viewport.innerHeight - rect.height - 10);
    waypointCard.style.left = `${left}px`;
    waypointCard.style.top = `${top}px`;
  };

  const dispose = () => {
    if(disposed) return;
    disposed = true;
    hideTooltip();
    hideWaypointCard();
  };

  return Object.freeze({showTooltip, hideTooltip, showWaypointCard, hideWaypointCard, dispose});
}
