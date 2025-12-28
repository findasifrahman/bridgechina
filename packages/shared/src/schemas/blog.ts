import { z } from 'zod';

export const createBlogPostSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(3),
  excerpt: z.string().optional(),
  content_md: z.string().min(10),
  cover_asset_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  published_at: z.string().datetime().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

