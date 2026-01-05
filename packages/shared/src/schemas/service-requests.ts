import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  category_key: z.enum(['guide', 'hotel', 'transport', 'halal_food', 'medical', 'translation_help', 'shopping', 'tours', 'esim']),
  city_id: z.string().uuid(),
  customer_name: z.string().min(2),
  phone: z.string().min(10),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  request_payload: z.record(z.unknown()),
});

export const updateServiceRequestStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'quoted', 'confirmed', 'paid', 'partially_paid', 'booked', 'service_done', 'payment_done', 'done', 'complete', 'cancelled']),
  assigned_to: z.string().uuid().optional(),
  note_internal: z.string().optional(),
  note_user: z.string().optional(),
  notify_user: z.boolean().optional(),
  notify_provider: z.boolean().optional(),
  total_amount: z.number().positive().optional(),
  paid_amount: z.number().min(0).optional(),
  is_fully_paid: z.boolean().optional(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestStatusInput = z.infer<typeof updateServiceRequestStatusSchema>;

