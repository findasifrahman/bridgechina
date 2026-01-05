/**
 * Zod schemas for shopping endpoints
 */

import { z } from 'zod';

export const searchByKeywordSchema = z.object({
  keyword: z.string().max(200).optional(), // Allow empty keyword if category is provided
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sort: z.enum(['default', 'price_asc', 'price_desc', 'popular']).optional(),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
}).refine((data) => data.keyword || data.category, {
  message: "Either keyword or category must be provided",
});

export const searchByImageSchema = z.object({
  r2_public_url: z.string().url(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sort: z.enum(['default', 'price_asc', 'price_desc', 'popular']).optional(),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
});

export const getHotItemsSchema = z.object({
  category: z.string().optional(),
});

export const getItemDetailSchema = z.object({
  externalId: z.string().min(1),
  language: z.enum(['en', 'zh']).optional().default('zh'), // Language: 'en' for English, 'zh' for Chinese
});

