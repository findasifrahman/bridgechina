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

const memoryCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
function needsTranslation(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  
  // Count Chinese characters
  const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = normalized.length;
  
  // If less than 30% are Chinese, consider it non-Chinese
  return chineseChars / totalChars < 0.3;
}

/**
 * Translate text from English to Chinese using Google Translate API
 */
async function translateWithGoogle(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_LANGUAGE_API_KEY;
  if (!apiKey) {
    console.warn('[Google Translate] GOOGLE_LANGUAGE_API_KEY not set, skipping translation');
    return text; // Return original if no API key
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'zh',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Translate] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json() as {
      data?: {
        translations?: Array<{ translatedText?: string }>;
      };
    };
    const translated = data.data?.translations?.[0]?.translatedText;
    
    if (!translated) {
      console.warn('[Google Translate] No translation in response:', data);
      return text;
    }

    return translated;
  } catch (error: any) {
    console.error('[Google Translate] Translation failed:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Translate keyword from English to Chinese with caching
 * Returns original text if translation fails or not needed
 */
export async function translateKeywordToChinese(keyword: string): Promise<string> {
  // Check if translation is needed
  if (!needsTranslation(keyword)) {
    console.log('[Google Translate] Keyword appears to be Chinese, skipping translation');
    return keyword;
  }

  const normalized = normalizeSourceText(keyword);
  const cacheKey = `google:zh:${normalized}`;

  // Check memory cache first
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    console.log('[Google Translate] Using memory cache for:', normalized);
    return memoryEntry.translated;
  }

  // Check database cache
  try {
    const dbEntry = await prisma.productTitleTranslation.findUnique({
      where: { source_text: normalized },
    });

    if (dbEntry && dbEntry.provider === 'google') {
      console.log('[Google Translate] Using DB cache for:', normalized);
      
      // Update memory cache
      memoryCache.set(cacheKey, {
        translated: dbEntry.translated_text,
        expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
      });

      return dbEntry.translated_text;
    }
  } catch (error: any) {
    console.warn('[Google Translate] DB lookup failed:', error.message);
    // Continue to API call
  }

  // Call Google Translate API
  console.log('[Google Translate] Calling API for:', normalized);
  try {
    const translated = await translateWithGoogle(keyword);

    // Save to database (upsert)
    try {
      await prisma.productTitleTranslation.upsert({
        where: { source_text: normalized },
        create: {
          source_text: normalized,
          translated_text: translated,
          provider: 'google',
        },
        update: {
          translated_text: translated,
          provider: 'google',
        },
      });
    } catch (dbError: any) {
      console.warn('[Google Translate] Failed to save to DB:', dbError.message);
      // Continue even if DB save fails
    }

    // Update memory cache
    memoryCache.set(cacheKey, {
      translated,
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    });

    console.log('[Google Translate] Translation successful:', { original: normalized, translated });
    return translated;
  } catch (error: any) {
    console.error('[Google Translate] Translation failed, returning original:', error.message);
    return keyword; // Return original on failure
  }
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

