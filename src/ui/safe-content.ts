const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const HTML_ESCAPES: Record<string, string> = {
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;',
};

const RASTER_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;
const HEX_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i;

export function escapeHtmlText(value: unknown): string {
  return String(value ?? '').replace(HTML_ESCAPE_PATTERN, character => HTML_ESCAPES[character]);
}

export function sanitizeExternalHttpUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if(!raw) return null;
  try {
    const url = new URL(raw);
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if(url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sanitizeImageSource(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if(!raw) return null;
  if(RASTER_DATA_URL.test(raw)) return raw;
  if(raw.startsWith('blob:')) return raw;
  return sanitizeExternalHttpUrl(raw);
}

export function sanitizeHexColor(value: unknown, fallback = '#64748b'): string {
  const raw = String(value ?? '').trim();
  return HEX_COLOR.test(raw) ? raw : fallback;
}
