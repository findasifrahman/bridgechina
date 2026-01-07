/**
 * Zod schemas for shopping endpoints
 */

import { z } from 'zod';

export const searchByKeywordSchema = z.object({
  keyword: z.string().max(200).optional(), // Allow empty keyword if category is provided
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  // TMAPI docs sort values: default, sales, price_up, price_down
  // We also accept legacy aliases (price_asc/price_desc) for backward compatibility.
  sort: z.enum(['default', 'sales', 'price_up', 'price_down', 'price_asc', 'price_desc', 'popular']).optional().default('sales'),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
}).refine((data) => data.keyword || data.category, {
  message: "Either keyword or category must be provided",
});

export const searchByImageSchema = z.object({
  r2_public_url: z.string().url(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  // TMAPI docs sort values: default, sales, price_up, price_down
  // We also accept legacy aliases (price_asc/price_desc) for backward compatibility.
  sort: z.enum(['default', 'sales', 'price_up', 'price_down', 'price_asc', 'price_desc', 'popular']).optional().default('sales'),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
});

export const getHotItemsSchema = z.object({
  category: z.string().optional(),
});

export const getItemDetailSchema = z.object({
  externalId: z.string().min(1),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
});

