import { z } from 'zod';

export const createCitySchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  country: z.string().default('China'),
  is_active: z.boolean().default(true),
});

export const createHotelSchema = z.object({
  city_id: z.string().uuid(),
  name: z.string().min(2),
  address: z.string(),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
  price_from: z.number().positive().optional(),
  currency: z.string().default('CNY'),
  verified: z.boolean().default(false),
  description: z.string().optional(),
  contact_phone: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const createRestaurantSchema = z.object({
  city_id: z.string().uuid(),
  name: z.string().min(2),
  address: z.string(),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
  halal_verified: z.boolean().default(false),
  delivery_supported: z.boolean().default(false),
  description: z.string().optional(),
  contact_phone: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const createMedicalCenterSchema = z.object({
  city_id: z.string().uuid(),
  name: z.string().min(2),
  type: z.enum(['hospital', 'clinic', 'pharmacy']),
  languages: z.array(z.string()).optional(),
  verified: z.boolean().default(false),
  address: z.string(),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const createTourSchema = z.object({
  city_id: z.string().uuid(),
  name: z.string().min(2),
  duration_text: z.string().optional(),
  price_from: z.number().positive().optional(),
  currency: z.string().default('CNY'),
  description: z.string().optional(),
  meeting_point: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const createTransportProductSchema = z.object({
  city_id: z.string().uuid(),
  type: z.enum(['pickup', 'point_to_point', 'daily_charter']),
  base_price: z.number().positive(),
  currency: z.string().default('CNY'),
  rules: z.record(z.unknown()).optional(),
});

