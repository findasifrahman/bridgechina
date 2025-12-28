import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  city_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  owner_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

