export function resolveAuthRedirect(userRoles: string[] = [], fallback = '/user'): string {
  if (userRoles.includes('ADMIN') || userRoles.includes('EDITOR')) return '/admin';
  if (userRoles.includes('OPS')) return '/ops/inbox';
  if (userRoles.includes('SELLER')) return '/seller';
  if (userRoles.includes('SERVICE_PROVIDER') && !userRoles.some((role) => ['ADMIN', 'OPS'].includes(role))) return '/provider';
  return fallback;
}
