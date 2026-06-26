import { prisma } from '../../lib/prisma.js';

const SETTINGS_KEY = 'shopping_app_settings';
const CACHE_TTL_MS = Number(process.env.SHOPPING_SETTINGS_CACHE_TTL_MS || 3 * 24 * 60 * 60 * 1000);

export type ShoppingAppSettings = {
  searchLanguage: 'zh' | 'en';
  cnyToBdt: number;
  cnyToUsd: number;
};

const defaults: ShoppingAppSettings = {
  searchLanguage: 'zh',
  cnyToBdt: Number(process.env.CNY_TO_BDT || 15),
  cnyToUsd: Number(process.env.CNY_TO_USD || 0.14),
};

let cached: { value: ShoppingAppSettings; expiresAt: number } | null = null;

function normalizeSettings(value: any): ShoppingAppSettings {
  const searchLanguage = value?.searchLanguage === 'en' ? 'en' : 'zh';
  const cnyToBdt = Number(value?.cnyToBdt ?? value?.CNY_TO_BDT ?? defaults.cnyToBdt);
  const cnyToUsd = Number(value?.cnyToUsd ?? value?.CNY_TO_USD ?? defaults.cnyToUsd);
  return {
    searchLanguage,
    cnyToBdt: Number.isFinite(cnyToBdt) && cnyToBdt > 0 ? cnyToBdt : defaults.cnyToBdt,
    cnyToUsd: Number.isFinite(cnyToUsd) && cnyToUsd > 0 ? cnyToUsd : defaults.cnyToUsd,
  };
}

export async function getShoppingAppSettings(forceRefresh = false): Promise<ShoppingAppSettings> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  const value = normalizeSettings(row?.value_json);
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function updateShoppingAppSettings(input: Partial<ShoppingAppSettings>) {
  const current = await getShoppingAppSettings(true);
  const next = normalizeSettings({ ...current, ...input });
  const row = await prisma.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value_json: next },
    create: { key: SETTINGS_KEY, value_json: next },
  });
  cached = { value: next, expiresAt: Date.now() + CACHE_TTL_MS };
  return { ...next, updated_at: row.updated_at };
}

export function clearShoppingAppSettingsCache() {
  cached = null;
}
