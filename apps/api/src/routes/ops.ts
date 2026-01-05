/**
 * Ops Routes
 * Routes for operations team to manage WhatsApp conversations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendText, sendMedia } from '../modules/whatsapp/twilio.client.js';
import { z } from 'zod';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DISTILL_MODEL = process.env.OPENAI_DISTILL_MODEL || 'gpt-4o-mini';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const replySchema = z.object({
  text: z.string(),
  mediaUrl: z.string().optional(),
});

export default async function opsRoutes(fastify: FastifyInstance) {
  // All ops routes require authentication and OPS/ADMIN/SELLER/PARTNER role
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('ADMIN', 'OPS', 'SELLER', 'PARTNER'));

  // List conversations
  fastify.get('/conversations', async (request: FastifyRequest) => {
    const query = request.query as {
      channel?: string;
      mode?: string;
      q?: string;
      page?: string;
    };

    const channel = query.channel || 'twilio_whatsapp';
    const mode = query.mode;
    const search = query.q;
    const page = parseInt(query.page || '1');
    const pageSize = 50;

    const where: any = {
      external_channel: channel,
    };

    if (mode) {
      where.mode = mode;
    }

    if (search) {
      where.OR = [
        { external_from: { contains: search } },
        { last_message_preview: { contains: search } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          assignedUser: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { last_inbound_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

  // Get conversation detail
  fastify.get('/conversations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { before } = request.query as { before?: string };
    const limit = 20; // Load 20 messages at a time

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    // Get total message count
    const totalMessages = await prisma.message.count({
      where: { conversation_id: id },
    });

    // Load messages (newest first, then reverse for display)
    let messages;
    if (before) {
      // Load older messages before the specified message
      messages = await prisma.message.findMany({
        where: {
          conversation_id: id,
          created_at: {
            lt: new Date(before),
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
      messages.reverse(); // Reverse to show oldest first
    } else {
      // Load latest messages
      messages = await prisma.message.findMany({
        where: { conversation_id: id },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
      messages.reverse(); // Reverse to show oldest first
    }

    return {
      ...conversation,
      messages,
      hasMore: before
        ? messages.length === limit
        : totalMessages > limit,
      totalMessages,
    };
  });

  // Take over conversation (set to HUMAN mode)
  fastify.post('/conversations/:id/takeover', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    const now = new Date();
    const updateData: any = {
      mode: 'HUMAN',
      mode_changed_at: now,
    };

    // Set first_human_takeover_at only if not already set
    if (!conversation.first_human_takeover_at) {
      updateData.first_human_takeover_at = now;
    }

    // Set assigned_user_id if not already set
    if (!conversation.assigned_user_id) {
      updateData.assigned_user_id = req.user.id;
    }

    await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    return { success: true, mode: 'HUMAN' };
  });

  // Release conversation (set to AI mode)
  fastify.post('/conversations/:id/release', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    await prisma.conversation.update({
      where: { id },
      data: {
        mode: 'AI',
        assigned_user_id: null,
      },
    });

    return { success: true, mode: 'AI' };
  });

  // Send reply
  fastify.post('/conversations/:id/reply', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = replySchema.parse(request.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || !conversation.external_from) {
      reply.status(404).send({ error: 'Conversation not found or invalid' });
      return;
    }

    if (conversation.mode !== 'HUMAN') {
      reply.status(400).send({ error: 'Conversation must be in HUMAN mode to send replies' });
      return;
    }

    const externalFrom = conversation.external_from; // Store in local variable for type narrowing
    if (!externalFrom) {
      reply.status(404).send({ error: 'Conversation external_from is invalid' });
      return;
    }

    try {
      const req = request as any;
      let providerSid: string | null = null;

      // Only send via Twilio for WhatsApp conversations
      if (conversation.channel === 'whatsapp') {
        if (body.mediaUrl) {
          // Send media message
          providerSid = await sendMedia(externalFrom, body.mediaUrl, body.text);
        } else {
          // Send text message
          providerSid = await sendText(externalFrom, body.text);
        }
      }
      // For webchat, we don't send via Twilio - just store the message
      // The webchat widget will poll for new messages

      // Determine provider based on channel
      const provider = conversation.channel === 'whatsapp' ? 'twilio' : 'web_chat';
      
      // Store outbound message
      const message = await prisma.message.create({
        data: {
          conversation_id: id,
          role: 'assistant',
          direction: 'OUTBOUND',
          provider: provider,
          provider_sid: providerSid,
          content: body.text,
          status: 'sent',
          meta_json: {
            ...(body.mediaUrl ? { mediaUrl: body.mediaUrl } : {}),
            handled_by_user_id: req.user.id,
          },
        },
      });

      // Update conversation
      const now = new Date();
      const currentConv = await prisma.conversation.findUnique({
        where: { id },
        select: { first_human_reply_at: true },
      });

      const updateData: any = {
        last_outbound_at: now,
        last_message_preview: body.text.substring(0, 100),
      };

      // Set first_human_reply_at only if not already set
      if (!currentConv?.first_human_reply_at) {
        updateData.first_human_reply_at = now;
      }

      await prisma.conversation.update({
        where: { id },
        data: updateData,
      });

      return { success: true, providerSid };
    } catch (error: any) {
      fastify.log.error({ error }, '[Ops Routes] Failed to send reply');
      reply.status(500).send({ error: error.message || 'Failed to send message' });
    }
  });

  const rejectOfferSchema = z.object({
    reject_reason: z.string().min(1, 'Reject reason is required'),
  });

  const sendOfferToUserSchema = z.object({
    custom_message: z.string().optional(),
  });

  // List submitted offers
  fastify.get('/offers', async (request: FastifyRequest) => {
    const query = request.query as { status?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['submitted', 'approved', 'rejected', 'sent_to_user'] };
    }

    const [offers, total] = await Promise.all([
      prisma.providerOffer.findMany({
        where,
        include: {
          request: {
            include: {
              category: true,
              city: true,
              providerMessageContexts: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
          },
          provider: {
            select: { id: true, email: true, phone: true },
          },
          approvedByUser: {
            select: { id: true, email: true, phone: true },
          },
        },
        orderBy: { submitted_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.providerOffer.count({ where }),
    ]);

    return {
      offers: offers.map(offer => ({
        ...offer,
        request: {
          ...offer.request,
          latest_context: offer.request?.providerMessageContexts?.[0] || null,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Approve an offer
  fastify.post('/offers/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const offer = await prisma.providerOffer.findUnique({
      where: { id },
      select: { id: true, status: true, request_id: true },
    });

    if (!offer) {
      reply.status(404).send({ error: 'Offer not found' });
      return;
    }
    if (offer.status !== 'submitted') {
      reply.status(400).send({ error: `Offer cannot be approved in status: ${offer.status}` });
      return;
    }

    const updatedOffer = await prisma.providerOffer.update({
      where: { id },
      data: {
        status: 'approved',
        approved_at: new Date(),
        approved_by: req.user.id,
      },
    });

    // Set first_ops_approval_at on ServiceRequest if null
    const currentServiceRequest = await prisma.serviceRequest.findUnique({
      where: { id: offer.request_id },
      select: { first_ops_approval_at: true },
    });

    if (!currentServiceRequest?.first_ops_approval_at) {
      await prisma.serviceRequest.update({
        where: { id: offer.request_id },
        data: {
          first_ops_approval_at: new Date(),
          ops_last_action_at: new Date(),
        },
      });
    } else {
      await prisma.serviceRequest.update({
        where: { id: offer.request_id },
        data: {
          ops_last_action_at: new Date(),
        },
      });
    }

    return updatedOffer;
  });

  // Reject an offer
  fastify.post('/offers/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = rejectOfferSchema.parse(request.body);
    const req = request as any;

    const offer = await prisma.providerOffer.findUnique({
      where: { id },
      select: { id: true, status: true, request_id: true },
    });

    if (!offer) {
      reply.status(404).send({ error: 'Offer not found' });
      return;
    }
    if (offer.status !== 'submitted') {
      reply.status(400).send({ error: `Offer cannot be rejected in status: ${offer.status}` });
      return;
    }

    const updatedOffer = await prisma.providerOffer.update({
      where: { id },
      data: {
        status: 'rejected',
        rejected_at: new Date(),
        approved_by: req.user.id,
        reject_reason: body.reject_reason,
      },
    });

    await prisma.serviceRequest.update({
      where: { id: offer.request_id },
      data: {
        ops_last_action_at: new Date(),
      },
    });

    return updatedOffer;
  });

  // Send an approved offer to the user via WhatsApp
  fastify.post('/offers/:id/send-to-user', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = sendOfferToUserSchema.parse(request.body);
    const req = request as any;

    const offer = await prisma.providerOffer.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            category: true,
            providerMessageContexts: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
        provider: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    if (!offer) {
      reply.status(404).send({ error: 'Offer not found' });
      return;
    }
    if (offer.status !== 'approved') {
      reply.status(400).send({ error: `Offer must be approved before sending to user. Current status: ${offer.status}` });
      return;
    }

    // Find conversation by created_from_conversation_id
    let conversation = null;
    if (offer.request.created_from_conversation_id) {
      conversation = await prisma.conversation.findUnique({
        where: { id: offer.request.created_from_conversation_id },
        select: { id: true, external_from: true },
      });
    }

    if (!conversation || !conversation.external_from) {
      reply.status(400).send({ error: 'Conversation or user WhatsApp number not found for this request.' });
      return;
    }
    if (!openai) {
      reply.status(500).send({ error: 'OpenAI API key not configured for message distillation.' });
      return;
    }

    const userWhatsappNumber = conversation.external_from;
    const providerNote = offer.provider_note || '';
    const payloadJson = offer.payload_json ? JSON.stringify(offer.payload_json, null, 2) : '';
    const requestSummary = offer.request.providerMessageContexts?.[0]?.extracted_summary || 'the service request';

    let messageToDistill = `User requested: ${requestSummary}\n\nProvider's note: ${providerNote}`;
    if (payloadJson) {
      messageToDistill += `\n\nProvider's structured details: ${payloadJson}`;
    }

    let userFriendlyMessage: string;

    if (body.custom_message) {
      userFriendlyMessage = body.custom_message;
    } else {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_DISTILL_MODEL,
          messages: [
            {
              role: 'system',
              content: `Distill the following provider offer into a short, user-friendly English message for a customer via WhatsApp. Do not include provider contact details. Include clear next steps for the user.
              Example next step: "If you want to confirm, please reply CONFIRM and we will send payment instructions."`,
            },
            { role: 'user', content: messageToDistill },
          ],
          temperature: 0.3,
          max_tokens: 300,
        });
        userFriendlyMessage = response.choices[0].message?.content?.trim() || "We have an update regarding your request. Please reply to learn more.";
      } catch (error) {
        console.error('[OPS API] OpenAI distillation failed:', error);
        userFriendlyMessage = `We have an update regarding your request for ${offer.request.category?.key || 'service'}. The provider has submitted an offer: "${providerNote}". Please reply to discuss further.`;
      }
    }

    // Send WhatsApp message
    try {
      await sendText(userWhatsappNumber, userFriendlyMessage);

      // Persist outbound message
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          role: 'assistant',
          direction: 'OUTBOUND',
          provider: 'twilio',
          content: userFriendlyMessage,
          status: 'sent',
        },
      });

      // Update offer status
      await prisma.providerOffer.update({
        where: { id },
        data: {
          status: 'sent_to_user',
          sent_to_user_at: new Date(),
        },
      });

      // Update ServiceRequest ops_last_action_at
      await prisma.serviceRequest.update({
        where: { id: offer.request_id },
        data: {
          ops_last_action_at: new Date(),
        },
      });

      return { success: true, message: 'Offer sent to user via WhatsApp' };
    } catch (error) {
      console.error('[OPS API] Failed to send WhatsApp message:', error);
      reply.status(500).send({ error: 'Failed to send WhatsApp message' });
    }
  });

  // Get a specific service request for OPS
  fastify.get('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        providerMessageContexts: {
          orderBy: { created_at: 'asc' },
        },
        providerDispatches: {
          include: {
            provider: {
              select: { id: true, email: true, phone: true },
            },
          },
          orderBy: { sent_at: 'asc' },
        },
        providerOffers: {
          include: {
            provider: {
              select: { id: true, email: true, phone: true },
            },
            approvedByUser: {
              select: { id: true, email: true, phone: true },
            },
          },
          orderBy: { submitted_at: 'desc' },
        },
        statusEvents: {
          include: {
            createdBy: {
              select: { id: true, email: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        conversation: {
          select: {
            id: true,
            channel: true,
            external_channel: true,
          },
        },
      },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Service request not found' });
      return;
    }

    // Get sibling requests if bundle_key exists
    let bundleRequests: any[] = [];
    if (serviceRequest.bundle_key) {
      bundleRequests = await prisma.serviceRequest.findMany({
        where: {
          bundle_key: serviceRequest.bundle_key,
          id: { not: id }, // Exclude current request
        },
        include: {
          category: true,
          city: true,
        },
        orderBy: { created_at: 'asc' },
      });
    }

    return {
      request: serviceRequest,
      bundleRequests,
    };
  });

  // Update request status with timeline event
  const updateRequestStatusSchema = z.object({
    status_to: z.string().min(1, 'Status is required'),
    note_internal: z.string().optional(),
    note_user: z.string().optional(),
    notify_user: z.boolean().optional().default(false),
  });

  fastify.post('/requests/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateRequestStatusSchema.parse(request.body);
    const req = request as any;

    // Fetch current request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        conversation: true,
      },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Service request not found' });
      return;
    }

    const statusFrom = serviceRequest.status;

    // Update request status
    await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: body.status_to,
        ops_last_action_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create status event
    await prisma.serviceRequestStatusEvent.create({
      data: {
        request_id: id,
        status_from: statusFrom,
        status_to: body.status_to,
        note_internal: body.note_internal || null,
        note_user: body.note_user || null,
        created_by: req.user.id,
      },
    });

    // Notify user if requested and conversation exists
    let notificationSent = false;
    if (body.notify_user && serviceRequest.conversation) {
      const notifyText = body.note_user || `Your request status has been updated to: ${body.status_to}`;
      
      if (serviceRequest.conversation.channel === 'whatsapp') {
        // Send via Twilio for WhatsApp
        try {
          const { sendText } = await import('../modules/whatsapp/twilio.client.js');
          const providerSid = await sendText(serviceRequest.conversation.external_from!, notifyText);
          
          await prisma.message.create({
            data: {
              conversation_id: serviceRequest.conversation.id,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: notifyText,
              status: 'sent',
              meta_json: {
                type: 'status_update',
                request_id: id,
                status_to: body.status_to,
              },
            },
          });
          notificationSent = true;
        } catch (error: any) {
          fastify.log.error({ error }, '[Ops Routes] Failed to send WhatsApp notification');
        }
      } else if (serviceRequest.conversation.channel === 'webchat') {
        // Store message only for webchat (no Twilio)
        await prisma.message.create({
          data: {
            conversation_id: serviceRequest.conversation.id,
            role: 'assistant',
            direction: 'OUTBOUND',
            provider: 'web_chat',
            content: notifyText,
            status: 'sent',
            meta_json: {
              type: 'status_update',
              request_id: id,
              status_to: body.status_to,
            },
          },
        });
        notificationSent = true;
      }
    }

    return {
      success: true,
      status: body.status_to,
      notificationSent,
    };
  });
}

