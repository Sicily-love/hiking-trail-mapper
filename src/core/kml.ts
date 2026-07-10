import type { KmlCoordTuple, KmlParseModel, KmlParseModelInput, KmlTrackPoint } from './types.ts';

export function parseKmlCoordinateText(text: string | null | undefined): KmlCoordTuple[] {
  if(!text) return [];
  const points: KmlCoordTuple[] = [];
  for(const rawPiece of text.split(/\s+/)) {
    const piece = rawPiece.trim();
    if(!piece) continue;
    const parts = piece.split(',');
    if(parts.length < 2) continue;
    const lng = Number.parseFloat(parts[0]);
    const lat = Number.parseFloat(parts[1]);
    const elevRaw = parts.length >= 3 ? Number.parseFloat(parts[2]) : 0;
    if(Number.isNaN(lng) || Number.isNaN(lat)) continue;
    points.push([lng, lat, Number.isNaN(elevRaw) ? 0 : elevRaw]);
  }
  return points;
}

export function parseGxCoordText(text: string | null | undefined): KmlCoordTuple | null {
  if(!text) return null;
  const parts = text.trim().split(/\s+/);
  if(parts.length < 2) return null;
  const lng = Number.parseFloat(parts[0]);
  const lat = Number.parseFloat(parts[1]);
  const elevRaw = parts.length >= 3 ? Number.parseFloat(parts[2]) : 0;
  if(Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return [lng, lat, Number.isNaN(elevRaw) ? 0 : elevRaw];
}

export function kmlCoordsToTrackPoints(coords: KmlCoordTuple[], times: string[] = []): KmlTrackPoint[] {
  return coords.map(([lng, lat, elev], i) => ({
    lng,
    lat,
    elev,
    t: times[i] || '',
    spd: 0,
  }));
}

export function extractKmlImageUrl(desc: string | null | undefined): string {
  if(!desc) return '';
  const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if(imgMatch) return imgMatch[1];
  const urlMatch = desc.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/i);
  return urlMatch ? urlMatch[0] : '';
}

export function shortKmlLabel(name: string | null | undefined): string {
  if(!name) return '';
  const trimmed = name.trim();
  const match = trimmed.match(/^\d+\.\s*(.+)$/);
  return match ? match[1].trim() : trimmed;
}

export function normalizeKmlTitle(title: string | null | undefined, fallback = 'KML 轨迹'): string {
  const cleaned = (title || '').trim();
  return cleaned || fallback;
}

export function buildKmlParseModel(input: KmlParseModelInput, fallbackTitle = 'KML 轨迹'): KmlParseModel {
  const trackPoints: KmlTrackPoint[] = [];
  for(const text of input.lineStringCoordinateTexts || []) {
    trackPoints.push(...kmlCoordsToTrackPoints(parseKmlCoordinateText(text)));
  }

  if(trackPoints.length === 0) {
    for(const gxTrack of input.gxTracks || []) {
      const whens = gxTrack.whens || [];
      (gxTrack.coords || []).forEach((coordText, i) => {
        const coord = parseGxCoordText(coordText);
        if(!coord) return;
        trackPoints.push({
          lng: coord[0],
          lat: coord[1],
          elev: coord[2],
          t: whens[i] || '',
          spd: 0,
        });
      });
    }
  }

  const waypoints = [];
  let wpId = 0;
  for(const wp of input.waypoints || []) {
    const coords = parseKmlCoordinateText(wp.coordinateText);
    if(!coords.length) continue;
    const [lng, lat] = coords[0];
    const hasName = typeof wp.name === 'string';
    const name = hasName ? (wp.name || '').trim() : `标注点${wpId + 1}`;
    wpId++;
    waypoints.push({
      id: wpId,
      name,
      time: '',
      lng,
      lat,
      photo: extractKmlImageUrl(wp.description),
    });
  }

  let trackId = '';
  let beginTime = '';
  for(const entry of input.data || []) {
    const name = entry.name || '';
    const value = (entry.value || '').trim();
    if(!trackId && (name === 'TrackId' || name === 'OriginTrackId') && value) trackId = value;
    if(name === 'BeginTime' && value) beginTime = value;
  }

  return {
    title: normalizeKmlTitle(input.title, fallbackTitle),
    trackPoints,
    waypoints,
    trackId,
    beginTime,
  };
}
