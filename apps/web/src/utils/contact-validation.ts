export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeBangladeshPhone(value: string): string {
  const trimmed = value.trim().replace(/[\s-]/g, '');
  if (trimmed.startsWith('+880')) return trimmed;
  if (trimmed.startsWith('880')) return `+${trimmed}`;
  if (trimmed.startsWith('01')) return `+88${trimmed}`;
  return trimmed;
}

export function isValidBangladeshPhone(value: string): boolean {
  return /^\+8801[3-9]\d{8}$/.test(normalizeBangladeshPhone(value));
}

export function contactKind(value: string): 'email' | 'phone' | 'unknown' {
  const trimmed = value.trim();
  if (trimmed.includes('@')) return isValidEmail(trimmed) ? 'email' : 'unknown';
  if (/^[+\d\s-]+$/.test(trimmed)) return isValidBangladeshPhone(trimmed) ? 'phone' : 'unknown';
  return 'unknown';
}
