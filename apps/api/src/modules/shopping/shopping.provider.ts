export type ShoppingProviderKey = 'tmapi_1688' | 'shopping_otapi';

export function getShoppingProviderKey(): ShoppingProviderKey {
  const isActiveRaw = process.env.IS_OTAPI_ACTIVE;
  if (typeof isActiveRaw === 'string') {
    const v = isActiveRaw.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return 'shopping_otapi';
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return 'tmapi_1688';
  }

  const raw = (process.env.SHOPPING_PROVIDER || '').trim().toLowerCase();
  if (raw === 'shopping_otapi' || raw === 'otapi' || raw === 'otapi_1688') return 'shopping_otapi';
  return 'tmapi_1688';
}
