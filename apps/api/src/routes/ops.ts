/**
 * Ops Routes
 * Routes for operations team to manage WhatsApp conversations
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
        messages: {
          orderBy: { created_at: 'asc' },
          take: 50, // Last 50 messages
        },
      },
    });

    if (!conversation) {
      reply.status(404).send({ error: 'Conversation not found' });
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
      let providerSid: string;

      if (body.mediaUrl) {
        // Send media message
        providerSid = await sendMedia(externalFrom, body.mediaUrl, body.text);
      } else {
        // Send text message
        providerSid = await sendText(externalFrom, body.text);
      }

      const req = request as any;
      
      // Store outbound message
      const message = await prisma.message.create({
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
}

