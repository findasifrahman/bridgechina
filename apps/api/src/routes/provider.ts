/**
 * Provider Routes
 * Routes for service providers to manage their assigned conversations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendText, sendMedia } from '../modules/whatsapp/twilio.client.js';
import { z } from 'zod';

const replySchema = z.object({
  text: z.string(),
  mediaUrl: z.string().optional(),
});

export default async function providerRoutes(fastify: FastifyInstance) {
  // All provider routes require authentication and SERVICE_PROVIDER role
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('SERVICE_PROVIDER'));

  // List assigned conversations
  fastify.get('/conversations', async (request: FastifyRequest) => {
    const req = request as any;
    const query = request.query as {
      mode?: string;
      category?: string;
      page?: string;
    };

    const mode = query.mode;
    const category = query.category;
    const page = parseInt(query.page || '1');
    const pageSize = 50;

    const where: any = {
      assigned_user_id: req.user.id, // Only show assigned conversations
    };

    if (mode) {
      where.mode = mode;
    }

    if (category) {
      where.category_key = category;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              whatsapp: true,
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
    const req = request as any;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            email: true,
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
          take: 100, // Last 100 messages
        },
      },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    // Ensure provider can only access their assigned conversations
    if (conversation.assigned_user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    return conversation;
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

    // Ensure provider can only take over their assigned conversations
    if (conversation.assigned_user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
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

    await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    return { success: true, mode: 'HUMAN' };
  });

  // Release conversation (set to AI mode)
  fastify.post('/conversations/:id/release', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    // Ensure provider can only release their assigned conversations
    if (conversation.assigned_user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    await prisma.conversation.update({
      where: { id },
      data: {
        mode: 'AI',
        mode_changed_at: new Date(),
      },
    });

    return { success: true, mode: 'AI' };
  });

  // Send reply
  fastify.post('/conversations/:id/reply', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;
    const body = replySchema.parse(request.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || !conversation.external_from) {
      reply.status(404).send({ error: 'Conversation not found or invalid' });
      return;
    }

    // Ensure provider can only reply to their assigned conversations
    if (conversation.assigned_user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    if (conversation.mode !== 'HUMAN') {
      reply.status(400).send({ error: 'Conversation must be in HUMAN mode to send replies' });
      return;
    }

    try {
      let providerSid: string;

      if (body.mediaUrl) {
        // Send media message
        providerSid = await sendMedia(conversation.external_from, body.mediaUrl, body.text);
      } else {
        // Send text message
        providerSid = await sendText(conversation.external_from, body.text);
      }

      // Store outbound message
      await prisma.message.create({
        data: {
          conversation_id: id,
          role: 'assistant',
          direction: 'OUTBOUND',
          provider: 'twilio',
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
      const currentConversation = await prisma.conversation.findUnique({
        where: { id },
        select: { first_human_reply_at: true },
      });

      const updateData: any = {
        last_outbound_at: now,
        last_message_preview: body.text.substring(0, 100),
      };

      // Set first_human_reply_at only if not already set
      if (!currentConversation?.first_human_reply_at) {
        updateData.first_human_reply_at = now;
      }

      await prisma.conversation.update({
        where: { id },
        data: updateData,
      });

      return { success: true, providerSid };
    } catch (error: any) {
      fastify.log.error({ error }, '[Provider Routes] Failed to send reply');
      reply.status(500).send({ error: error.message || 'Failed to send message' });
    }
  });

  // List dispatches (requests assigned to this provider)
  fastify.get('/dispatches', async (request: FastifyRequest) => {
    const req = request as any;
    const query = request.query as {
      status?: string;
      category?: string;
      city?: string;
      page?: string;
    };

    const page = parseInt(query.page || '1');
    const pageSize = 50;

    const where: any = {
      provider_user_id: req.user.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [dispatches, total] = await Promise.all([
      prisma.providerDispatch.findMany({
        where,
        include: {
          request: {
            include: {
              category: true,
              city: true,
              providerMessageContexts: {
                orderBy: { created_at: 'desc' },
                take: 1, // Get latest context
              },
            },
          },
        },
        orderBy: { sent_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.providerDispatch.count({ where }),
    ]);

    // Filter by category/city if provided (post-query filter for now)
    let filtered = dispatches;
    if (query.category) {
      filtered = filtered.filter((d) => d.request.category.key === query.category);
    }
    if (query.city) {
      filtered = filtered.filter((d) => d.request.city.slug === query.city || d.request.city.id === query.city);
    }

    return {
      dispatches: filtered,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  });

  // Get request detail with context
  fastify.get('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    // Check if provider has dispatch for this request
    const dispatch = await prisma.providerDispatch.findUnique({
      where: {
        request_id_provider_user_id: {
          request_id: id,
          provider_user_id: req.user.id,
        },
      },
    });

    if (!dispatch) {
      reply.status(403).send({ error: 'Access denied - request not dispatched to you' });
      return;
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        providerMessageContexts: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        providerOffers: {
          where: { provider_user_id: req.user.id },
          orderBy: { submitted_at: 'desc' },
        },
        providerDispatches: {
          include: {
            provider: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Request not found' });
      return;
    }

    return {
      request: serviceRequest,
      dispatch,
    };
  });

  // Mark dispatch as viewed
  fastify.post('/requests/:id/mark-viewed', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const dispatch = await prisma.providerDispatch.findUnique({
      where: {
        request_id_provider_user_id: {
          request_id: id,
          provider_user_id: req.user.id,
        },
      },
    });

    if (!dispatch) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    await prisma.providerDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'viewed',
        viewed_at: new Date(),
      },
    });

    return { success: true };
  });

  // Submit offer
  fastify.post('/requests/:id/offers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;
    const body = request.body as {
      provider_note: string;
      payload_json?: any;
    };

    if (!body.provider_note || body.provider_note.trim().length === 0) {
      reply.status(400).send({ error: 'provider_note is required' });
      return;
    }

    // Check if provider has dispatch for this request
    const dispatch = await prisma.providerDispatch.findUnique({
      where: {
        request_id_provider_user_id: {
          request_id: id,
          provider_user_id: req.user.id,
        },
      },
      include: {
        request: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!dispatch) {
      reply.status(403).send({ error: 'Access denied - request not dispatched to you' });
      return;
    }

    // Create offer
    const offer = await prisma.providerOffer.create({
      data: {
        request_id: id,
        provider_user_id: req.user.id,
        service_type: dispatch.request.category.key,
        provider_note: body.provider_note.trim(),
        payload_json: body.payload_json || null,
        status: 'submitted',
      },
    });

    // Update dispatch
    await prisma.providerDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'responded',
        responded_at: new Date(),
      },
    });

    // Update request: set first_provider_response_at if null
    await prisma.serviceRequest.update({
      where: { id },
      data: {
        first_provider_response_at: new Date(),
      },
    });

    return { success: true, offer };
  });

  // Get provider stats/KPIs
  fastify.get('/stats', async (request: FastifyRequest) => {
    const req = request as any;
    const now = new Date();
    const dayAgo = new Date(now);
    dayAgo.setHours(dayAgo.getHours() - 24);

    const [
      assignedCount,
      unreadCount,
    ] = await Promise.all([
      // Total assigned conversations
      prisma.conversation.count({
        where: {
          assigned_user_id: req.user.id,
        },
      }),
      // Unread inbound messages (conversations with new messages in last 24h)
      prisma.conversation.count({
        where: {
          assigned_user_id: req.user.id,
          last_inbound_at: {
            gte: dayAgo,
          },
        },
      }),
    ]);

    // Calculate average response time manually
    const conversationsWithReplies = await prisma.conversation.findMany({
      where: {
        assigned_user_id: req.user.id,
        first_human_reply_at: { not: null },
        last_inbound_at: { not: null },
      },
      select: {
        first_human_reply_at: true,
        last_inbound_at: true,
      },
    });

    let totalResponseTime = 0;
    let countWithReplies = 0;

    for (const conv of conversationsWithReplies) {
      if (conv.first_human_reply_at && conv.last_inbound_at) {
        const responseTime = conv.first_human_reply_at.getTime() - conv.last_inbound_at.getTime();
        if (responseTime > 0) {
          totalResponseTime += responseTime;
          countWithReplies++;
        }
      }
    }

    const avgResponseTimeMs = countWithReplies > 0 ? totalResponseTime / countWithReplies : 0;
    const avgResponseTimeMinutes = Math.round(avgResponseTimeMs / (1000 * 60));

    return {
      assignedConversations: assignedCount,
      unreadLast24h: unreadCount,
      avgResponseTimeMinutes,
    };
  });
}

