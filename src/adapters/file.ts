import { downsampleTrackForCanvas } from '../core/performance/downsample.ts';
import type { TrackTuple } from '../core/types.ts';

export interface FflateCodec {
  unzipSync: (bytes: Uint8Array) => Record<string, Uint8Array>;
  strToU8: (text: string) => Uint8Array;
  zip: (
    files: Record<string, Uint8Array>,
    options: {level: number},
    callback: (error: Error | null, data: Uint8Array | null) => void,
  ) => void;
}

export interface FileArchiveAdapter {
  readonly available: boolean;
  unzip: (bytes: Uint8Array) => Record<string, Uint8Array>;
  decode: (bytes: Uint8Array) => string;
  zipTextFiles: (files: Record<string, string>) => Promise<Uint8Array>;
}

export function createFileArchiveAdapter(codec: FflateCodec | null | undefined): FileArchiveAdapter {
  const available = !!codec
    && typeof codec.unzipSync === 'function'
    && typeof codec.strToU8 === 'function'
    && typeof codec.zip === 'function';
  return Object.freeze({
    available,
    unzip(bytes: Uint8Array) {
      if(!codec || typeof codec.unzipSync !== 'function') throw new Error('fflate is unavailable');
      return codec.unzipSync(bytes);
    },
    decode(bytes: Uint8Array) {
      return new TextDecoder('utf-8').decode(bytes);
    },
    zipTextFiles(files: Record<string, string>) {
      if(!available || !codec) return Promise.reject(new Error('fflate is unavailable'));
      const encoded = Object.fromEntries(
        Object.entries(files).map(([name, text]) => [name, codec.strToU8(text)]),
      );
      return new Promise<Uint8Array>((resolve, reject) => {
        codec.zip(encoded, {level:6}, (error, data) => {
          if(error) reject(error);
          else if(!data) reject(new Error('ZIP returned no data'));
          else resolve(data);
        });
      });
    },
  });
}

interface WritableFile {
  write: (value: Blob) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFileHandle {
  createWritable: () => Promise<WritableFile>;
}

export interface BrowserFileEnvironment {
  document: Document;
  url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  BlobCtor: typeof Blob;
  showSaveFilePicker?: (options: unknown) => Promise<SaveFileHandle>;
}

export interface BrowserFileAdapter {
  download: (content: string | Uint8Array, filename: string, mimeType: string) => void;
  saveText: (
    text: string,
    filename: string,
    mimeType: string,
    extension: string,
  ) => Promise<'picker' | 'download'>;
}

export function createBrowserFileAdapter(environment: BrowserFileEnvironment): BrowserFileAdapter {
  const createBlob = (content: string | Uint8Array, mimeType: string): Blob => {
    const part: BlobPart = typeof content === 'string'
      ? content
      : content.slice().buffer as ArrayBuffer;
    return new environment.BlobCtor([part], {type:mimeType});
  };
  const downloadBlob = (blob: Blob, filename: string): void => {
    const anchor = environment.document.createElement('a');
    const objectUrl = environment.url.createObjectURL(blob);
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    environment.url.revokeObjectURL(objectUrl);
  };
  return Object.freeze({
    download(content: string | Uint8Array, filename: string, mimeType: string) {
      downloadBlob(createBlob(content, mimeType), filename);
    },
    async saveText(text: string, filename: string, mimeType: string, extension: string) {
      const blob = createBlob(text, mimeType);
      if(environment.showSaveFilePicker) {
        try {
          const handle = await environment.showSaveFilePicker({
            suggestedName:filename,
            types:[{description:extension.toUpperCase(), accept:{[mimeType.split(';')[0]]:[extension]}}],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return 'picker';
        } catch {
          // Cancellation and unsupported picker states fall back to a normal download.
        }
      }
      downloadBlob(blob, filename);
      return 'download';
    },
  });
}

export function renderDayElevationChart(
  document: Document,
  sourcePoints: readonly TrackTuple[],
  color: string,
  dayLabel: string,
): string {
  if(!sourcePoints.length) return '';
  const width = 900;
  const height = 200;
  const points = downsampleTrackForCanvas(sourcePoints, width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if(!context) throw new Error('Canvas 2D context is unavailable');
  context.fillStyle = '#1a1f2e';
  context.fillRect(0, 0, width, height);

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let peakIndex = 0;
  const elevations = points.map((point, index) => {
    const elevation = Number.isFinite(point[2]) ? Number(point[2]) : 0;
    if(elevation < minElevation) minElevation = elevation;
    if(elevation > maxElevation) {
      maxElevation = elevation;
      peakIndex = index;
    }
    return elevation;
  });
  const range = maxElevation - minElevation || 1;
  const left = 52;
  const right = 12;
  const top = 24;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number): number => left + (index / Math.max(1, points.length - 1)) * plotWidth;
  const y = (elevation: number): number => top + plotHeight * (1 - (elevation - minElevation) / range);

  context.beginPath();
  context.moveTo(left, top + plotHeight);
  points.forEach((point, index) => context.lineTo(x(index), y(elevations[index])));
  context.lineTo(left + plotWidth, top + plotHeight);
  context.closePath();
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const rgb = match ? match.slice(1).map(value => Number.parseInt(value, 16)) : [100, 150, 255];
  const gradient = context.createLinearGradient(0, top, 0, top + plotHeight);
  gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fill();

  context.beginPath();
  points.forEach((point, index) => index === 0
    ? context.moveTo(x(index), y(elevations[index]))
    : context.lineTo(x(index), y(elevations[index])));
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
  context.font = '11px monospace';
  context.textAlign = 'right';
  for(const fraction of [0, 0.5, 1]) {
    const elevation = minElevation + fraction * range;
    const lineY = top + plotHeight * (1 - fraction);
    context.fillStyle = 'rgba(100,120,150,0.25)';
    context.fillRect(left, lineY - 0.5, plotWidth, 1);
    context.fillStyle = '#8899aa';
    context.fillText(`${Math.round(elevation)}m`, left - 4, lineY + 4);
  }
  context.fillStyle = color;
  context.beginPath();
  context.arc(x(peakIndex), y(maxElevation), 4, 0, Math.PI * 2);
  context.fill();
  context.font = 'bold 12px sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.fillText(`▲${Math.round(maxElevation)}m`, x(peakIndex), y(maxElevation) - 10);
  context.font = '11px monospace';
  context.fillStyle = '#aabbcc';
  context.textAlign = 'left';
  context.fillText(`${Math.round(elevations[0])}m`, left + 2, height - 8);
  context.textAlign = 'right';
  context.fillText(`${Math.round(elevations.at(-1) || 0)}m`, left + plotWidth - 2, height - 8);
  context.font = 'bold 14px sans-serif';
  context.fillStyle = color;
  context.textAlign = 'left';
  context.fillText(`${dayLabel} 海拔剖面`, left, 16);
  return canvas.toDataURL('image/png');
}
