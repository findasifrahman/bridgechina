/**
 * Provider Routes
 * Routes for service providers to manage their assigned conversations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendText, sendMedia } from '../modules/whatsapp/twilio.client.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

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

  // Get provider profile
  fastify.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;

    const profile = await prisma.serviceProviderProfile.findUnique({
      where: { user_id: req.user.id },
      include: {
        city: true,
        coverAsset: true,
        serviceProfiles: {
          orderBy: { category_key: 'asc' },
        },
      },
    });

    if (!profile) {
      reply.status(404).send({ error: 'Provider profile not found' });
      return;
    }

    return profile;
  });

  // Update provider profile
  const updateProviderProfileSchema = z.object({
    provider_type: z.enum(['individual', 'company']).optional(),
    display_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_name: z.string().optional(),
    whatsapp: z.string().optional().nullable(),
    wechat: z.string().optional().nullable(),
    email: z.preprocess((val) => val === '' ? null : val, z.string().email().nullable().optional()),
    website: z.preprocess((val) => val === '' ? null : val, z.string().url().nullable().optional()),
    description: z.string().optional().nullable(),
    languages: z.array(z.string()).optional().nullable(),
    service_area: z.string().optional().nullable(),
    address_text: z.string().optional().nullable(),
    cover_asset_id: z.preprocess((val) => val === '' ? null : val, z.string().uuid().nullable().optional()),
    gallery_asset_ids: z.array(z.string().uuid()).optional().nullable(),
    // categories field removed - only admins can manage categories via /api/admin/service-providers
    city_id: z.preprocess((val) => val === '' ? null : val, z.string().uuid().nullable().optional()),
  });

  fastify.patch('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = updateProviderProfileSchema.parse(request.body);

    // Check if profile exists
    const existing = await prisma.serviceProviderProfile.findUnique({
      where: { user_id: req.user.id },
    });

    if (!existing) {
      reply.status(404).send({ error: 'Provider profile not found. Please contact admin to create your profile.' });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (body.provider_type !== undefined) updateData.provider_type = body.provider_type;
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.contact_name !== undefined) updateData.contact_name = body.contact_name;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.wechat !== undefined) updateData.wechat = body.wechat;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.languages !== undefined) updateData.languages = body.languages;
    if (body.service_area !== undefined) updateData.service_area = body.service_area;
    if (body.address_text !== undefined) updateData.address_text = body.address_text;
    if (body.cover_asset_id !== undefined) updateData.cover_asset_id = body.cover_asset_id;
    if (body.gallery_asset_ids !== undefined) updateData.gallery_asset_ids = body.gallery_asset_ids;
    // categories removed - only admins can update categories via /api/admin/service-providers/:id
    if (body.city_id !== undefined) updateData.city_id = body.city_id;

    // Mark onboarding as completed if key fields are filled
    const hasRequiredFields = body.display_name || body.description || body.contact_name;
    if (hasRequiredFields && !existing.onboarding_completed_at) {
      updateData.onboarding_completed_at = new Date();
    }

    const updated = await prisma.serviceProviderProfile.update({
      where: { user_id: req.user.id },
      data: updateData,
      include: {
        city: true,
        coverAsset: true,
        serviceProfiles: {
          orderBy: { category_key: 'asc' },
        },
      },
    });

    return updated;
  });

  // Service-specific profile management
  const updateServiceProfileSchema = z.object({
    category_key: z.string(),
    is_active: z.boolean().optional(),
    description: z.string().optional().nullable(),
    pricing_info: z.record(z.any()).optional().nullable(),
    availability_info: z.record(z.any()).optional().nullable(),
    specializations: z.record(z.any()).optional().nullable(),
  });

  fastify.post('/profile/service', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = updateServiceProfileSchema.parse(request.body);

    const providerProfile = await prisma.serviceProviderProfile.findUnique({
      where: { user_id: req.user.id },
    });

    if (!providerProfile) {
      reply.status(404).send({ error: 'Provider profile not found' });
      return;
    }

    // Upsert service profile
    const serviceProfile = await prisma.serviceProviderServiceProfile.upsert({
      where: {
        provider_profile_id_category_key: {
          provider_profile_id: providerProfile.id,
          category_key: body.category_key,
        },
      },
      update: {
        is_active: body.is_active,
        description: body.description,
        pricing_info: body.pricing_info ?? Prisma.JsonNull,
        availability_info: body.availability_info ?? Prisma.JsonNull,
        specializations: body.specializations ?? Prisma.JsonNull,
      },
      create: {
        provider_profile_id: providerProfile.id,
        category_key: body.category_key,
        is_active: body.is_active ?? true,
        description: body.description,
        pricing_info: body.pricing_info ?? Prisma.JsonNull,
        availability_info: body.availability_info ?? Prisma.JsonNull,
        specializations: body.specializations ?? Prisma.JsonNull,
      },
    });

    return serviceProfile;
  });
}

