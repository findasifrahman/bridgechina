import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  category_key: z.enum(['hotel', 'transport', 'halal_food', 'medical', 'translation_help', 'shopping_service', 'tours', 'esim', 'guide']),
  city_id: z.string().uuid(),
  customer_name: z.string().min(2),
  phone: z.string().min(10),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  request_payload: z.record(z.unknown()),
});

export const updateServiceRequestStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'quoted', 'confirmed', 'paid', 'booked', 'done', 'cancelled']),
  assigned_to: z.string().uuid().optional(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestStatusInput = z.infer<typeof updateServiceRequestStatusSchema>;

