/**
 * Google Translate integration with DB + LRU caching
 * Reuses translations to control API costs
 */

import { prisma } from '../../lib/prisma.js';

// In-memory LRU cache (process-level)
interface CacheEntry {
  translated: string;
  expiresAt: number;
}

interface PersistedTranslationRow {
  source_text: string;
  translated_text: string;
  provider: string;
}

const memoryCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DAILY_USAGE_SETTINGS_KEY = 'google_translate_daily_usage';
const DAILY_CHAR_LIMIT = Number(process.env.GOOGLE_TRANSLATE_DAILY_CHAR_LIMIT || 18000);
const DAILY_CHAR_RESERVE = Number(process.env.GOOGLE_TRANSLATE_DAILY_CHAR_RESERVE || 2000);

type TranslateUsageState = {
  date: string;
  chars: number;
  requests: number;
};

let usageCache: { value: TranslateUsageState; expiresAt: number } | null = null;

export function googleTranslateConfigStatus() {
  const apiKey = process.env.GOOGLE_LANGUAGE_API_KEY || '';
  return {
    configured: Boolean(apiKey),
    keyPrefix: apiKey ? apiKey.slice(0, 6) : null,
    keySuffix: apiKey ? apiKey.slice(-4) : null,
  };
}

/**
 * Normalize source text for cache key
 */
function normalizeSourceText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/[^\w\s\u4e00-\u9fff]/g, '') // Remove punctuation except Chinese chars
    .substring(0, 200); // Limit length
}

/**
 * Check if text contains mostly Latin characters (needs translation)
 */
function hasChineseCharacters(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function hasMeaningfulTranslatableChinese(text: string): boolean {
  if (!hasChineseCharacters(text)) return false;
  const stripped = text
    .replace(/[\d\s\-_/|()[\]{}.,:;+*"'`~!?@#$%^&=<>]+/g, '')
    .replace(/[A-Za-z]+/g, '');
  return /[\u4e00-\u9fff]/.test(stripped);
}

function needsTranslation(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  
  // Count Chinese characters
  const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = normalized.length;
  
  // If less than 30% are Chinese, consider it non-Chinese
  return chineseChars / totalChars < 0.3;
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
  if (!forceRefresh && usageCache && usageCache.expiresAt > Date.now()) {
    return usageCache.value;
  }

  const today = getUsageDateKey();
  const row = await prisma.siteSetting.findUnique({ where: { key: DAILY_USAGE_SETTINGS_KEY } }).catch(() => null);
  const raw = row?.value_json as Partial<TranslateUsageState> | undefined;
  const value: TranslateUsageState = {
    date: raw?.date === today ? today : today,
    chars: raw?.date === today ? Number(raw?.chars || 0) : 0,
    requests: raw?.date === today ? Number(raw?.requests || 0) : 0,
  };
  usageCache = { value, expiresAt: Date.now() + 60 * 1000 };
  return value;
}

async function recordDailyUsage(chars: number): Promise<void> {
  if (!chars || chars <= 0) return;
  const current = await getDailyUsage();
  const next: TranslateUsageState = {
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
    console.warn('[Google Translate] Failed to persist usage stats:', error.message);
  });
}

async function hasBudgetFor(chars: number): Promise<boolean> {
  const current = await getDailyUsage();
  const limit = Math.max(0, DAILY_CHAR_LIMIT - DAILY_CHAR_RESERVE);
  return current.chars + chars <= limit;
}

/**
 * Translate text from English to Chinese using Google Translate API
 */
async function translateWithGoogleBatch(texts: string[], target: string, source?: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_LANGUAGE_API_KEY;
  if (!apiKey) {
    console.warn('[Google Translate] GOOGLE_LANGUAGE_API_KEY not set, skipping translation');
    return texts;
  }

  if (texts.length === 0) return [];

  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const allowed = await hasBudgetFor(totalChars);
  if (!allowed) {
    console.warn('[Google Translate] Daily character budget nearly exhausted, skipping translation batch', {
      totalChars,
      dailyLimit: DAILY_CHAR_LIMIT,
      reserve: DAILY_CHAR_RESERVE,
    });
    return texts;
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        ...(source ? { source } : {}),
        target,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Translate] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.slice(0, 1000),
        hint: response.status === 403
          ? 'Google rejected the API key. Check Cloud Translation API enablement, billing, API restrictions, and application restrictions for server-side Railway requests.'
          : undefined,
      });
      return texts;
    }

    const data = await response.json() as {
      data?: {
        translations?: Array<{ translatedText?: string }>;
      };
    };
    const translated = data.data?.translations?.map((item) => item.translatedText || '') || [];

    if (translated.length !== texts.length) {
      console.warn('[Google Translate] No translation in response:', data);
      return texts;
    }

    await recordDailyUsage(totalChars);
    return translated.map((value, index) => value || texts[index]);
  } catch (error: any) {
    console.error('[Google Translate] Translation failed:', {
      error: error.message,
      stack: error.stack,
    });
    return texts;
  }
}

/**
 * Translate keyword from English to Chinese with caching
 * Returns original text if translation fails or not needed
 */
async function translateManyWithCache(params: {
  texts: string[];
  target: string;
  source?: string;
  cachePrefix: string;
  shouldTranslate: (text: string) => boolean;
}): Promise<string[]> {
  if (!params.texts.length) return [];

  const results = [...params.texts];
  const missingIndexes: number[] = [];
  const missingOriginals: string[] = [];
  const missingCacheKeys: string[] = [];

  for (const [index, originalText] of params.texts.entries()) {
    if (!params.shouldTranslate(originalText)) continue;

    const normalized = normalizeSourceText(originalText);
    const dbSourceText = `${params.cachePrefix}:${normalized}`;
    const memoryKey = `google:${params.cachePrefix}:${normalized}`;
    const memoryEntry = memoryCache.get(memoryKey);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      results[index] = memoryEntry.translated;
      continue;
    }

    missingIndexes.push(index);
    missingOriginals.push(originalText);
    missingCacheKeys.push(dbSourceText);
  }

  if (missingCacheKeys.length) {
    try {
      const dbEntries = await prisma.productTitleTranslation.findMany({
        where: { source_text: { in: missingCacheKeys } },
      });
      const dbMap = new Map<string, string>(
        dbEntries.map((entry) => [String(entry.source_text), String(entry.translated_text)]),
      );

      const stillMissingIndexes: number[] = [];
      const stillMissingOriginals: string[] = [];
      const stillMissingCacheKeys: string[] = [];

      for (let i = 0; i < missingIndexes.length; i += 1) {
        const dbSourceText = missingCacheKeys[i];
        const translated = dbMap.get(dbSourceText);
        if (translated) {
          results[missingIndexes[i]] = translated;
          memoryCache.set(`google:${dbSourceText}`, {
            translated,
            expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
          });
        } else {
          stillMissingIndexes.push(missingIndexes[i]);
          stillMissingOriginals.push(missingOriginals[i]);
          stillMissingCacheKeys.push(dbSourceText);
        }
      }

      missingIndexes.length = 0;
      missingOriginals.length = 0;
      missingCacheKeys.length = 0;
      missingIndexes.push(...stillMissingIndexes);
      missingOriginals.push(...stillMissingOriginals);
      missingCacheKeys.push(...stillMissingCacheKeys);
    } catch (error: any) {
      console.warn('[Google Translate] DB lookup failed:', error.message);
    }
  }

  if (!missingOriginals.length) return results;

  const translatedValues = await translateWithGoogleBatch(missingOriginals, params.target, params.source);
  const rowsToPersist: PersistedTranslationRow[] = [];

  for (let i = 0; i < missingIndexes.length; i += 1) {
    const translated = translatedValues[i] || missingOriginals[i];
    const index = missingIndexes[i];
    const dbSourceText = missingCacheKeys[i];
    results[index] = translated;
    memoryCache.set(`google:${dbSourceText}`, {
      translated,
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    });
    if (translated !== missingOriginals[i]) {
      rowsToPersist.push({
        source_text: dbSourceText,
        translated_text: translated,
        provider: 'google',
      });
    }
  }

  if (rowsToPersist.length) {
    await prisma.productTitleTranslation.createMany({
      data: rowsToPersist,
      skipDuplicates: true,
    }).catch(async (error: any) => {
      console.warn('[Google Translate] createMany failed, falling back to upsert:', error.message);
      await Promise.all(rowsToPersist.map((row) =>
        prisma.productTitleTranslation.upsert({
          where: { source_text: row.source_text },
          create: row,
          update: {
            translated_text: row.translated_text,
            provider: row.provider,
          },
        }).catch((upsertError: any) => {
          console.warn('[Google Translate] Failed to save translation row:', upsertError.message);
        })
      ));
    });
  }

  return results;
}

/**
 * Translate keyword from English to Chinese with caching.
 * Returns original text if translation fails or not needed.
 */
export async function translateKeywordToChinese(keyword: string): Promise<string> {
  if (!needsTranslation(keyword)) {
    console.log('[Google Translate] Keyword appears to be Chinese, skipping translation');
    return keyword;
  }

  const [translated] = await translateManyWithCache({
    texts: [keyword],
    source: 'en',
    target: 'zh-CN',
    cachePrefix: 'en:zh',
    shouldTranslate: needsTranslation,
  });
  return translated || keyword;
}

/**
 * Translate Chinese product display text to English with caching.
 * Returns original text if translation fails or no Chinese characters are present.
 */
export async function translateChineseTextToEnglish(text: string): Promise<string> {
  const source = String(text || '').trim();
  if (!source || !hasMeaningfulTranslatableChinese(source)) return source;

  const [translated] = await translateManyWithCache({
    texts: [source],
    source: 'zh-CN',
    target: 'en',
    cachePrefix: 'zh:en',
    shouldTranslate: hasMeaningfulTranslatableChinese,
  });
  return translated || source;
}

export async function translateChineseTextsToEnglish(texts: string[]): Promise<string[]> {
  const prepared = texts.map((text) => String(text || '').trim());
  return translateManyWithCache({
    texts: prepared,
    source: 'zh-CN',
    target: 'en',
    cachePrefix: 'zh:en',
    shouldTranslate: hasMeaningfulTranslatableChinese,
  });
}

/**
 * Clean up expired memory cache entries (can be called periodically)
 */
export function cleanupMemoryCache(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Google Translate] Cleaned up ${cleaned} expired memory cache entries`);
  }
}

// Clean up memory cache every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 60 * 60 * 1000);
}

