import { buildTrackLatLngs, buildTrackLatLngSegments, normalizeTrackIndexRange } from './measure.ts';
import type { DayIndexRange, DayPreviewRenderModel, TrackIndexPoint, TrackTuple } from './types.ts';

export function buildMeasureSegmentRenderModel(
  track: TrackTuple[],
  ptA: TrackIndexPoint | null,
  ptB: TrackIndexPoint | null,
  maxPoints = 900,
  trackBreaks: number[] = [],
) {
  if(!track.length || !ptA || !ptB) return null;
  const range = normalizeTrackIndexRange(track, ptA.idx, ptB.idx);
  if(!range) return null;
  const segments = buildTrackLatLngSegments(track, range.iStart, range.iEnd, trackBreaks, maxPoints);
  if(!segments.length) return null;
  const latLngs = segments.length === 1 ? segments[0] : segments;
  return {
    ...range,
    latLngs,
    lineStyle: { color: '#fbbf24', weight: 6, opacity: 0.9, interactive: false },
  };
}

export function buildSegmentLayerModel(
  track: TrackTuple[],
  points: TrackIndexPoint[],
  dayColors: string[],
  maxPoints = 900,
  trackBreaks: number[] = [],
) {
  const segments = [];
  for(let d = 1; d < points.length; d++) {
    const range = normalizeTrackIndexRange(track, points[d - 1].idx, points[d].idx);
    if(!range) continue;
    segments.push({
      day: d,
      color: dayColors[(d - 1) % dayColors.length],
      ...range,
      latLngs:(() => {
        const paths = buildTrackLatLngSegments(track, range.iStart, range.iEnd, trackBreaks, maxPoints);
        return paths.length === 1 ? paths[0] : paths;
      })(),
      lineStyle: { color: dayColors[(d - 1) % dayColors.length], weight: 7, opacity: 0.85, interactive: false },
    });
  }

  const markers = points.map((p, i) => {
    const isBoundary = i > 0 && i < points.length - 1;
    return {
      pointIndex: i,
      trackIndex: p.idx,
      lat: p.lat,
      lng: p.lng,
      isBoundary,
      label: i === 0 ? '起' : (i === points.length - 1 ? '终' : `D${i}`),
      color: i === 0 ? '#22c55e' : (i === points.length - 1 ? '#ef4444' : '#fbbf24'),
      cursor: isBoundary ? 'move' : 'default',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      markerOptions: { draggable: isBoundary, autoPan: true },
    };
  });

  return { segments, markers };
}

export function buildDayPreviewRenderModel(
  track: TrackTuple[],
  range: DayIndexRange | null | undefined,
  maxPoints = 1200,
  trackBreaks: number[] = [],
): DayPreviewRenderModel | null {
  if(!track.length || !range) return null;
  const normalized = normalizeTrackIndexRange(track, range.iStart, range.iEnd);
  if(!normalized) return null;
  const segments = buildTrackLatLngSegments(track, normalized.iStart, normalized.iEnd, trackBreaks, maxPoints);
  if(!segments.length) return null;
  const latLngs = segments.length === 1 ? segments[0] : segments;
  const start = track[normalized.iStart];
  const end = track[normalized.iEnd];
  return {
    ...normalized,
    latLngs,
    lineStyle: { color: '#fbbf24', weight: 6, opacity: 0.9, interactive: false },
    fitOptions: { padding: [60, 60] },
    endpoints: [
      { label: 'A', lat: start[0], lng: start[1], color: '#22c55e' },
      { label: 'B', lat: end[0], lng: end[1], color: '#ef4444' },
    ],
  };
}
