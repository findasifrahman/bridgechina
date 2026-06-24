export function getApiBaseUrl(): string {
  const raw = String((import.meta as any).env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  return raw.replace(/\/api$/, '');
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

export function buildImageProxyUrl(url: string | null | undefined): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('/api/public/image-proxy')) return value;
  return buildApiUrl(`/api/public/image-proxy?url=${encodeURIComponent(value)}`);
}
