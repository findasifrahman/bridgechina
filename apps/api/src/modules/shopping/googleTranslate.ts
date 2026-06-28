/**
 * Azure Translator integration with DB + process memory caching.
 * The filename is kept for existing imports; the provider is Azure.
 */

import { prisma } from '../../lib/prisma.js';

interface CacheEntry {
  translated: string;
  expiresAt: number;
}

interface PersistedTranslationRow {
  source_text: string;
  translated_text: string;
  provider: string;
}

type TranslateUsageState = {
  date: string;
  chars: number;
  requests: number;
};

const memoryCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_USAGE_SETTINGS_KEY = 'azure_translate_daily_usage';
const DAILY_CHAR_LIMIT = Number(process.env.AZURE_TRANSLATE_DAILY_CHAR_LIMIT || process.env.GOOGLE_TRANSLATE_DAILY_CHAR_LIMIT || 18000);
const DAILY_CHAR_RESERVE = Number(process.env.AZURE_TRANSLATE_DAILY_CHAR_RESERVE || process.env.GOOGLE_TRANSLATE_DAILY_CHAR_RESERVE || 2000);
const PROVIDER = 'azure';

let usageCache: { value: TranslateUsageState; expiresAt: number } | null = null;

export function googleTranslateConfigStatus() {
  const key = process.env.AZURE_TRANSLATE_KEY || '';
  const endpoint = process.env.AZURE_TRANSLATE_ENDPOINT || '';
  return {
    provider: PROVIDER,
    configured: Boolean(key && endpoint),
    endpoint: endpoint ? 'set' : 'missing',
    region: process.env.AZURE_TRANSLATE_REGION ? 'set' : 'missing',
    keyPrefix: key ? key.slice(0, 6) : null,
    keySuffix: key ? key.slice(-4) : null,
  };
}

function normalizeSourceText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fff]/g, '')
    .substring(0, 220);
}

export function hasChineseCharacters(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(String(text || ''));
}

function hasMeaningfulTranslatableChinese(text: string): boolean {
  if (!hasChineseCharacters(text)) return false;
  const stripped = String(text || '')
    .replace(/[\d\s\-_/|()[\]{}.,:;+*"'`~!?@#$%^&=<>]+/g, '')
    .replace(/[A-Za-z]+/g, '');
  return /[\u4e00-\u9fff]/.test(stripped);
}

function getUsageDateKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function getDailyUsage(forceRefresh = false): Promise<TranslateUsageState> {
  if (!forceRefresh && usageCache && usageCache.expiresAt > Date.now()) return usageCache.value;

  const today = getUsageDateKey();
  const row = await prisma.siteSetting.findUnique({ where: { key: DAILY_USAGE_SETTINGS_KEY } }).catch(() => null);
  const raw = row?.value_json as Partial<TranslateUsageState> | undefined;
  const value: TranslateUsageState = {
    date: today,
    chars: raw?.date === today ? Number(raw?.chars || 0) : 0,
    requests: raw?.date === today ? Number(raw?.requests || 0) : 0,
  };
  usageCache = { value, expiresAt: Date.now() + 60 * 1000 };
  return value;
}

async function hasBudgetFor(chars: number): Promise<boolean> {
  const current = await getDailyUsage();
  const limit = Math.max(0, DAILY_CHAR_LIMIT - DAILY_CHAR_RESERVE);
  return current.chars + chars <= limit;
}

async function recordDailyUsage(chars: number): Promise<void> {
  if (chars <= 0) return;
  const current = await getDailyUsage();
  const next = {
    date: current.date,
    chars: current.chars + chars,
    requests: current.requests + 1,
  };
  usageCache = { value: next, expiresAt: Date.now() + 60 * 1000 };
  await prisma.siteSetting.upsert({
    where: { key: DAILY_USAGE_SETTINGS_KEY },
    create: { key: DAILY_USAGE_SETTINGS_KEY, value_json: next },
    update: { value_json: next },
  }).catch((error: any) => {
    console.warn('[Azure Translator] Failed to persist usage stats:', error.message);
  });
}

function buildAzureTranslateUrl(endpoint: string): string {
  const normalized = endpoint.replace(/\/+$/, '');
  return `${normalized}/translate?api-version=3.0&from=zh-Hans&to=en`;
}

async function translateWithAzureBatch(texts: string[]): Promise<string[]> {
  const key = process.env.AZURE_TRANSLATE_KEY;
  const endpoint = process.env.AZURE_TRANSLATE_ENDPOINT;
  if (!key || !endpoint) {
    console.warn('[Azure Translator] AZURE_TRANSLATE_KEY or AZURE_TRANSLATE_ENDPOINT not set, skipping translation');
    return texts;
  }

  const candidates = texts.map((text) => String(text || '').trim());
  const totalChars = candidates.reduce((sum, text) => sum + text.length, 0);
  if (!candidates.length || totalChars <= 0) return candidates;
  if (!(await hasBudgetFor(totalChars))) {
    console.warn('[Azure Translator] Daily character budget nearly exhausted, skipping translation batch', {
      totalChars,
      dailyLimit: DAILY_CHAR_LIMIT,
      reserve: DAILY_CHAR_RESERVE,
    });
    return candidates;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': key,
    };
    if (process.env.AZURE_TRANSLATE_REGION) {
      headers['Ocp-Apim-Subscription-Region'] = process.env.AZURE_TRANSLATE_REGION;
    }

    const response = await fetch(buildAzureTranslateUrl(endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(candidates.map((text) => ({ text }))),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Azure Translator] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.slice(0, 1000),
      });
      return candidates;
    }

    const data = await response.json() as Array<{ translations?: Array<{ text?: string }> }>;
    const translated = data.map((row, index) => row.translations?.[0]?.text || candidates[index]);
    await recordDailyUsage(totalChars);
    return translated;
  } catch (error: any) {
    console.error('[Azure Translator] Translation failed:', {
      error: error.message,
      stack: error.stack,
    });
    return candidates;
  }
}

async function translateManyWithCache(texts: string[]): Promise<string[]> {
  if (!texts.length) return [];

  const results = texts.map((text) => String(text || '').trim());
  const missingIndexes: number[] = [];
  const missingOriginals: string[] = [];
  const missingCacheKeys: string[] = [];

  for (const [index, sourceText] of results.entries()) {
    if (!hasMeaningfulTranslatableChinese(sourceText)) continue;

    const normalized = normalizeSourceText(sourceText);
    const dbSourceText = `zh:en:${normalized}`;
    const memoryKey = `${PROVIDER}:${dbSourceText}`;
    const memoryEntry = memoryCache.get(memoryKey);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      results[index] = memoryEntry.translated;
      continue;
    }

    missingIndexes.push(index);
    missingOriginals.push(sourceText);
    missingCacheKeys.push(dbSourceText);
  }

  if (missingCacheKeys.length) {
    try {
      const rows = await prisma.productTitleTranslation.findMany({
        where: { source_text: { in: missingCacheKeys } },
      });
      const bySource = new Map<string, string>(rows.map((row) => [String(row.source_text), String(row.translated_text)]));
      const unresolvedIndexes: number[] = [];
      const unresolvedOriginals: string[] = [];
      const unresolvedCacheKeys: string[] = [];

      for (let i = 0; i < missingIndexes.length; i += 1) {
        const cacheKey = missingCacheKeys[i];
        const translated = bySource.get(cacheKey);
        if (translated) {
          results[missingIndexes[i]] = translated;
          memoryCache.set(`${PROVIDER}:${cacheKey}`, { translated, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
        } else {
          unresolvedIndexes.push(missingIndexes[i]);
          unresolvedOriginals.push(missingOriginals[i]);
          unresolvedCacheKeys.push(cacheKey);
        }
      }

      missingIndexes.length = 0;
      missingOriginals.length = 0;
      missingCacheKeys.length = 0;
      missingIndexes.push(...unresolvedIndexes);
      missingOriginals.push(...unresolvedOriginals);
      missingCacheKeys.push(...unresolvedCacheKeys);
    } catch (error: any) {
      console.warn('[Azure Translator] DB lookup failed:', error.message);
    }
  }

  if (!missingOriginals.length) return results;

  const translatedValues = await translateWithAzureBatch(missingOriginals);
  const rowsToPersist: PersistedTranslationRow[] = [];
  for (let i = 0; i < missingIndexes.length; i += 1) {
    const translated = translatedValues[i] || missingOriginals[i];
    const index = missingIndexes[i];
    const cacheKey = missingCacheKeys[i];
    results[index] = translated;
    memoryCache.set(`${PROVIDER}:${cacheKey}`, { translated, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
    if (translated !== missingOriginals[i]) {
      rowsToPersist.push({
        source_text: cacheKey,
        translated_text: translated,
        provider: PROVIDER,
      });
    }
  }

  if (rowsToPersist.length) {
    await prisma.productTitleTranslation.createMany({
      data: rowsToPersist,
      skipDuplicates: true,
    }).catch(async () => {
      await Promise.all(rowsToPersist.map((row) =>
        prisma.productTitleTranslation.upsert({
          where: { source_text: row.source_text },
          create: row,
          update: { translated_text: row.translated_text, provider: row.provider },
        }).catch((error: any) => {
          console.warn('[Azure Translator] Failed to save translation row:', error.message);
        })
      ));
    });
  }

  return results;
}

/**
 * Azure is only used for Chinese -> English. This function intentionally
 * does not spend translation characters on English -> Chinese search terms.
 */
export async function translateKeywordToChinese(keyword: string): Promise<string> {
  return String(keyword || '').trim();
}

export async function translateChineseTextToEnglish(text: string): Promise<string> {
  const source = String(text || '').trim();
  if (!source || !hasMeaningfulTranslatableChinese(source)) return source;
  const [translated] = await translateManyWithCache([source]);
  return translated || source;
}

export async function translateChineseTextsToEnglish(texts: string[]): Promise<string[]> {
  return translateManyWithCache(texts);
}

export function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 60 * 60 * 1000);
}
