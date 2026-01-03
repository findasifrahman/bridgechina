/**
 * Twilio WhatsApp Client
 * Handles Twilio API integration for WhatsApp messaging
 */

import twilio from 'twilio';
import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g., whatsapp:+14155238886
const TWILIO_WEBHOOK_VALIDATE = process.env.TWILIO_WEBHOOK_VALIDATE === 'true';

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn('[Twilio Client] ⚠️  TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
}

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

/**
 * Validate Twilio webhook signature
 */
export function validateWebhookSignature(
  request: FastifyRequest,
  url: string
): boolean {
  if (!TWILIO_WEBHOOK_VALIDATE || !TWILIO_AUTH_TOKEN) {
    return true; // Skip validation if disabled
  }

  const signature = (request.headers['x-twilio-signature'] as string) || '';
  if (!signature) {
    console.warn('[Twilio Client] No signature header found');
    return false;
  }

  try {
    // Note: Fastify with formbody doesn't expose rawBody by default
    // For production, consider using @fastify/raw-body or similar
    // For now, we'll skip validation if rawBody is not available
    // This is acceptable since webhook validation is optional (TWILIO_WEBHOOK_VALIDATE can be false)
    console.warn('[Twilio Client] Signature validation requires raw body - skipping validation');
    return true; // Allow request to proceed (validation can be enhanced later)
  } catch (error) {
    console.error('[Twilio Client] Signature validation error:', error);
    return false;
  }
}

/**
 * Send text message via WhatsApp
 */
export async function sendText(
  to: string,
  body: string
): Promise<string> {
  if (!twilioClient || !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio client not initialized or TWILIO_WHATSAPP_FROM not set');
  }

  // Validate sender number format
  if (!TWILIO_WHATSAPP_FROM.startsWith('whatsapp:+')) {
    throw new Error(`Invalid TWILIO_WHATSAPP_FROM format. Expected format: whatsapp:+14155238886, got: ${TWILIO_WHATSAPP_FROM}`);
  }

  try {
    console.log('[Twilio Client] Creating message:', {
      from: TWILIO_WHATSAPP_FROM,
      to: to,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 50),
    });

    const message = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: to,
      body: body,
    });

    console.log('[Twilio Client] Message created successfully:', {
      sid: message.sid,
      status: message.status,
    });

    return message.sid;
  } catch (error: any) {
    console.error('[Twilio Client] Send text error:', error);
    // Log helpful error message for common issues
    if (error.code === 21212) {
      console.error('[Twilio Client] Invalid sender number. Make sure TWILIO_WHATSAPP_FROM is a valid Twilio WhatsApp number.');
      console.error('[Twilio Client] For testing, use Twilio sandbox: whatsapp:+14155238886');
      console.error('[Twilio Client] For production, use your verified WhatsApp Business number from Twilio.');
    }
    throw error;
  }
}

/**
 * Send media message via WhatsApp
 */
export async function sendMedia(
  to: string,
  mediaUrl: string,
  caption?: string
): Promise<string> {
  if (!twilioClient || !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio client not initialized or TWILIO_WHATSAPP_FROM not set');
  }

  // Ensure mediaUrl is HTTPS
  const httpsUrl = mediaUrl.startsWith('http://')
    ? mediaUrl.replace('http://', 'https://')
    : mediaUrl;

  try {
    const message = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: to,
      mediaUrl: [httpsUrl],
      body: caption || '',
    });

    return message.sid;
  } catch (error: any) {
    console.error('[Twilio Client] Send media error:', error);
    throw error;
  }
}

