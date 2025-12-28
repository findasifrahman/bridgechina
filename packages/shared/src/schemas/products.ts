import { z } from 'zod';

export const createProductSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default('CNY'),
  stock_qty: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  images: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

