/**
 * WhatsApp Routes
 * Webhook endpoints for Twilio WhatsApp integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma.js';
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
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

export default async function whatsappRoutes(fastify: FastifyInstance) {
  // Health check for webhook endpoint (GET for testing)
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'twilio-whatsapp-webhook',
      timestamp: new Date().toISOString(),
      endpoints: {
        inbound: '/api/webhooks/twilio/whatsapp/inbound',
        status: '/api/webhooks/twilio/whatsapp/status',
      },
    };
  });

  // GET health checks for webhook endpoints (for testing without Twilio)
  fastify.get('/inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    return { ok: true, endpoint: 'twilio_whatsapp_inbound' };
  });

  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    return { ok: true, endpoint: 'twilio_whatsapp_status' };
  });

  // Inbound message webhook
  fastify.post('/inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;

      // Validate signature (if enabled)
      const TWILIO_WEBHOOK_VALIDATE = process.env.TWILIO_WEBHOOK_VALIDATE === 'true';
      if (TWILIO_WEBHOOK_VALIDATE) {
        const webhookUrl = `${APP_BASE_URL}/api/webhooks/twilio/whatsapp/inbound`;
        const isValid = validateWebhookSignature(request, webhookUrl);
        if (!isValid) {
          fastify.log.warn('[WhatsApp Routes] Invalid webhook signature');
          reply.status(403).send('Invalid signature');
          return;
        }
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
          reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
          return;
        }
        throw error;
      }

      // Generate thread key
      const threadKey = generateThreadKey(From, To);

      // Extract phone number from WhatsApp number (whatsapp:+880... -> +880...)
      const phoneNumber = From.replace(/^whatsapp:/, '');
      
      // Create or find lead
      let lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { whatsapp: From },
            { phone: phoneNumber },
          ],
        },
      });

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            name: ProfileName || 'WhatsApp User',
            phone: phoneNumber,
            whatsapp: From,
            source: 'whatsapp',
            status: 'new',
          },
        });
        fastify.log.info({ leadId: lead.id, phone: phoneNumber }, '[WhatsApp Routes] Created new lead');
      }

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
          lead_id: lead.id,
          mode: 'AI',
          last_inbound_at: new Date(),
          last_message_preview: Body?.substring(0, 100) || '',
        },
        update: {
          last_inbound_at: new Date(),
          last_message_preview: Body?.substring(0, 100) || '',
          lead_id: lead.id, // Update lead_id in case it wasn't set before
        },
      });

      // Auto-create user account from WhatsApp lead (on first message per conversation)
      // This ensures every WhatsApp lead becomes a website account
      if (!conversation.user_id) {
        try {
          const { ensureUserFromWhatsappLead } = await import('./whatsapp.service.js');
          const userInfo = await ensureUserFromWhatsappLead(phoneNumber, ProfileName || lead.name);
          
          // Link user to conversation if user was created
          if (userInfo.created) {
            const user = await prisma.user.findFirst({
              where: {
                OR: [
                  { phone: userInfo.phone },
                  { email: userInfo.email },
                ],
              },
            });
            
            if (user) {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { user_id: user.id },
              });
              
              // Update lead email if empty
              if (!lead.email) {
                await prisma.lead.update({
                  where: { id: lead.id },
                  data: { email: userInfo.email },
                });
              }
            }
          }
        } catch (error: any) {
          // Log but don't fail - user creation is best effort
          fastify.log.warn({ error: error.message }, '[WhatsApp Routes] Failed to create user from lead');
        }
      }

      // Collect media URLs and types (cap to 3 media)
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      const maxMedia = Math.min(NumMedia ? parseInt(NumMedia) : 0, 3);

      if (maxMedia > 0) {
        for (let i = 0; i < maxMedia; i++) {
          const mediaUrl = (payload as any)[`MediaUrl${i}`];
          const mediaType = (payload as any)[`MediaContentType${i}`];
          if (mediaUrl) {
            mediaUrls.push(mediaUrl);
            mediaTypes.push(mediaType || 'application/octet-stream');
          }
        }
      }

      // Detect media types (audio/image) so we can avoid confusing AI replies
      const hasMedia = mediaUrls.length > 0;
      const hasAudio = hasMedia && mediaTypes.some((t) => t.startsWith('audio/'));
      const hasImage = hasMedia && mediaTypes.some((t) => t.startsWith('image/'));

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
            mediaTypes: mediaTypes,
            numMedia: mediaUrls.length,
          },
        },
      });

      if (hasAudio && (!Body || !Body.trim())) {
        // Save message (so ops can see it) but don't trigger AI confusion
        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            role: 'user',
            direction: 'INBOUND',
            provider: 'twilio',
            provider_sid: MessageSid,
            content: '(voice note)',
            status: 'received',
            meta_json: {
              profileName: ProfileName,
              mediaUrls,
              mediaTypes,
              numMedia: NumMedia ? parseInt(NumMedia) : 0,
            },
          },
        });
      
        // Reply with a single cheap message (no extra AI calls)
        await sendText(  From,
          "I received a voice note 🎤.\n" +
          "Voice transcription isn’t enabled yet.\n" +
          "Please send your question as text, or upload an image to search products.\n\n" +
          "Website: https://bridgechina-web.vercel.app/");
      
        reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }
      
      /// end by me


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
        } catch (error: any) {
          fastify.log.error({ error }, '[WhatsApp Routes] Failed to send confirmation');
        }

        // Notify WeCom
        await sendWecomText(
          `New WhatsApp lead: ${From} | Human takeover requested | Last message: ${Body?.substring(0, 50) || '(media)'} | Open: ${APP_BASE_URL}/ops/inbox?c=${conversation.id}`
        );

        reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }

      // AI-first: Return 200 OK immediately, process async
      reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

      // Process AI reply asynchronously
      fastify.log.info({ conversationId: conversation.id }, '[WhatsApp Routes] Triggering async AI reply');
      setImmediate(() => {
        handleAIReply(conversation.id).catch((error) => {
          fastify.log.error({ error }, '[WhatsApp Routes] Error in async AI processing');
        });
      });
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WhatsApp Routes] Inbound webhook error');
      // Always return 200 to Twilio to prevent retries
      reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
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

      reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WhatsApp Routes] Status webhook error');
      reply.type('text/xml').code(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });
}

