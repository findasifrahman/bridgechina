/**
 * WhatsApp Schemas
 * Zod validation schemas for WhatsApp webhook payloads
 */

import { z } from 'zod';

export const inboundWebhookSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  MessageSid: z.string(),
  ProfileName: z.string().optional(),
  NumMedia: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MediaUrl1: z.string().optional(),
  MediaUrl2: z.string().optional(),
  MediaContentType0: z.string().optional(),
  MediaContentType1: z.string().optional(),
  MediaContentType2: z.string().optional(),
});

export const statusWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

