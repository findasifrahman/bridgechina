export type UserRole = 'ADMIN' | 'OPS' | 'EDITOR' | 'SELLER' | 'PARTNER' | 'USER';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type ServiceCategoryKey =
  | 'hotel'
  | 'transport'
  | 'halal_food'
  | 'medical'
  | 'translation_help'
  | 'shopping_service'
  | 'tours';

export type ServiceRequestStatus =
  | 'new'
  | 'in_progress'
  | 'quoted'
  | 'confirmed'
  | 'paid'
  | 'booked'
  | 'done'
  | 'cancelled';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'stripe' | 'bank' | 'usdt';

export type PaymentStatus = 'pending' | 'received' | 'refunded';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ProductStatus = 'draft' | 'active' | 'paused';

export type BlogPostStatus = 'draft' | 'published';

export type MedicalCenterType = 'hospital' | 'clinic' | 'pharmacy';

export type TransportProductType = 'pickup' | 'point_to_point' | 'daily_charter';

export type ConversationChannel = 'web' | 'whatsapp';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  roles?: string[]; // Array of role names (ADMIN, OPS, EDITOR, SELLER, etc.)
}

export interface ServiceRequest {
  id: string;
  category_id: string;
  city_id: string;
  user_id: string | null;
  lead_id: string | null;
  status: ServiceRequestStatus;
  assigned_to: string | null;
  customer_name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  request_payload: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

