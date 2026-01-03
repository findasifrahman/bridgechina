/**
 * WhatsApp Routes
 * Webhook endpoints for Twilio WhatsApp integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { validateWebhookSignature } from './twilio.client.js';
import { inboundWebhookSchema, statusWebhookSchema } from './whatsapp.schemas.js';
import { generateThreadKey, handleAIReply } from './whatsapp.service.js';
import { sendText } from './twilio.client.js';
import { sendWecomText } from '../../utils/wecom.js';

/**
 * Check if message requests human takeover
 */
function requestsHumanTakeover(body: string): boolean {
  const lower = body.toLowerCase();
  const keywords = ['human', 'agent', 'person', 'help me', 'operator', 'representative'];
  return keywords.some(keyword => lower.includes(keyword));
}

const prisma = new PrismaClient();
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

export default async function whatsappRoutes(fastify: FastifyInstance) {
  // Inbound message webhook
  fastify.post('/inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;

      // Validate signature (if enabled)
      const webhookUrl = `${APP_BASE_URL}/api/webhooks/twilio/whatsapp/inbound`;
      const isValid = validateWebhookSignature(request, webhookUrl);
      if (!isValid) {
        fastify.log.warn('[WhatsApp Routes] Invalid webhook signature');
        reply.status(403).send('Invalid signature');
        return;
      }

      // Parse and validate payload
      const payload = inboundWebhookSchema.parse(body);
      const { From, To, Body, MessageSid, ProfileName, NumMedia } = payload;

      // Idempotency check: Insert webhook event (unique constraint prevents duplicates)
      try {
        await prisma.twilioWebhookEvent.create({
          data: {
            event_type: 'inbound',
            provider_sid: MessageSid,
            payload: body as any,
          },
        });
      } catch (error: any) {
        // Unique constraint violation = already processed
        if (error.code === 'P2002') {
          fastify.log.info('[WhatsApp Routes] Duplicate webhook, returning 200 OK');
          reply.code(200).send('ok');
          return;
        }
        throw error;
      }

      // Generate thread key
      const threadKey = generateThreadKey(From, To);

      // Upsert conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          external_thread_key: threadKey,
        },
        create: {
          channel: 'whatsapp',
          external_channel: 'twilio_whatsapp',
          external_from: From,
          external_to: To,
          external_thread_key: threadKey,
          mode: 'AI',
          last_inbound_at: new Date(),
          last_message_preview: Body?.substring(0, 100) || '',
        },
        update: {
          last_inbound_at: new Date(),
          last_message_preview: Body?.substring(0, 100) || '',
        },
      });

      // Collect media URLs
      const mediaUrls: string[] = [];
      if (NumMedia && parseInt(NumMedia) > 0) {
        for (let i = 0; i < parseInt(NumMedia); i++) {
          const mediaUrl = (payload as any)[`MediaUrl${i}`];
          const mediaType = (payload as any)[`MediaContentType${i}`];
          if (mediaUrl) {
            mediaUrls.push(mediaUrl);
          }
        }
      }

      // Store inbound message
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          role: 'user',
          direction: 'INBOUND',
          provider: 'twilio',
          provider_sid: MessageSid,
          content: Body || '(media only)',
          status: 'received',
          meta_json: {
            profileName: ProfileName,
            mediaUrls: mediaUrls,
            numMedia: NumMedia ? parseInt(NumMedia) : 0,
          },
        },
      });

      // Check for human takeover request
      const bodyText = Body?.toLowerCase().trim() || '';
      if (requestsHumanTakeover(bodyText)) {
        // Update conversation mode
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { mode: 'HUMAN' },
        });

        // Send immediate confirmation
        const confirmationText = 'Got it — a human agent will reply shortly. ✅';
        try {
          const providerSid = await sendText(From, confirmationText);
          await prisma.message.create({
            data: {
              conversation_id: conversation.id,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: confirmationText,
              status: 'sent',
            },
          });
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { last_outbound_at: new Date() },
          });
        } catch (error) {
          fastify.log.error('[WhatsApp Routes] Failed to send confirmation:', error);
        }

        // Notify WeCom
        await sendWecomText(
          `New WhatsApp lead: ${From} | Human takeover requested | Last message: ${Body?.substring(0, 50) || '(media)'} | Open: ${APP_BASE_URL}/ops/inbox?c=${conversation.id}`
        );

        reply.code(200).send('ok');
        return;
      }

      // AI-first: Return 200 OK immediately, process async
      reply.code(200).send('ok');

      // Process AI reply asynchronously
      setImmediate(() => {
        handleAIReply(conversation.id).catch((error) => {
          fastify.log.error('[WhatsApp Routes] Error in async AI processing:', error);
        });
      });
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WhatsApp Routes] Inbound webhook error');
      // Always return 200 to Twilio to prevent retries
      reply.code(200).send('ok');
    }
  });

  // Status callback webhook
  fastify.post('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;

      // Parse and validate payload
      const payload = statusWebhookSchema.parse(body);
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;

      // Store status event
      await prisma.twilioMessageStatus.create({
        data: {
          provider_sid: MessageSid,
          status: MessageStatus,
          error_code: ErrorCode || null,
          error_message: ErrorMessage || null,
          raw: body as any,
        },
      });

      // Update message status
      await prisma.message.updateMany({
        where: { provider_sid: MessageSid },
        data: { status: MessageStatus },
      });

      reply.code(200).send('ok');
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WhatsApp Routes] Status webhook error');
      reply.code(200).send('ok');
    }
  });
}

