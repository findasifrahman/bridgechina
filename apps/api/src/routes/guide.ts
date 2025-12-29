/**
 * Guide Service Routes
 * 
 * Routes for:
 * - Guides to manage their profile and view/respond to requests
 * - Users to request guides and accept offers
 * - Admin to manage guides
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to check if user is a guide
async function requireGuide(request: FastifyRequest, reply: FastifyReply) {
  const req = request as any;
  if (!req.user) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }

  const guideProfile = await prisma.guideProfile.findUnique({
    where: { user_id: req.user.id },
  });

  if (!guideProfile) {
    reply.status(403).send({ error: 'User is not a guide' });
    return;
  }

  req.guideProfile = guideProfile;
}

export default async function guideRoutes(fastify: FastifyInstance) {
  // All guide routes require authentication
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get guide's own profile
  fastify.get('/profile', async (request: FastifyRequest) => {
    const req = request as any;
    const profile = await prisma.guideProfile.findUnique({
      where: { user_id: req.user.id },
      include: {
        city: true,
        coverAsset: true,
      },
    });

    if (!profile) {
      return { error: 'Guide profile not found' };
    }

    return profile;
  });

  // Create or update guide profile
  fastify.post('/profile', async (request: FastifyRequest) => {
    const req = request as any;
    const body = request.body as any;

    const profile = await prisma.guideProfile.upsert({
      where: { user_id: req.user.id },
      create: {
        user_id: req.user.id,
        city_id: body.city_id,
        display_name: body.display_name,
        bio: body.bio || null,
        languages: body.languages || [],
        hourly_rate: body.hourly_rate || null,
        daily_rate: body.daily_rate || null,
        verified: false,
        cover_asset_id: body.cover_asset_id || null,
      },
      update: {
        city_id: body.city_id,
        display_name: body.display_name,
        bio: body.bio || null,
        languages: body.languages || [],
        hourly_rate: body.hourly_rate || null,
        daily_rate: body.daily_rate || null,
        cover_asset_id: body.cover_asset_id || null,
      },
      include: {
        city: true,
        coverAsset: true,
      },
    });

    return profile;
  });

  // Get open guide requests in guide's city
  fastify.get('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireGuide(request, reply);
    if (reply.sent) return;
    const req = request as any;
    const { status, limit = '20' } = request.query as { status?: string; limit?: string };

    const where: any = {
      request: {
        city_id: req.guideProfile.city_id,
        status: { not: 'cancelled' },
      },
    };

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['new', 'quoted'] };
    }

    const requests = await prisma.guideRequest.findMany({
      where,
      include: {
        request: {
          include: {
            category: true,
            city: true,
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        },
        offers: {
          where: { guide_id: req.user.id },
        },
      },
      orderBy: { request: { created_at: 'desc' } },
      take: parseInt(limit),
    });

    return requests;
  });

  // Create guide offer for a request
  fastify.post('/offers', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireGuide(request, reply);
    if (reply.sent) return;
    const req = request as any;
    const body = request.body as any;

    // Verify request exists and is in guide's city
    const guideRequest = await prisma.guideRequest.findUnique({
      where: { request_id: body.request_id },
      include: {
        request: {
          include: { city: true },
        },
      },
    });

    if (!guideRequest) {
      return { error: 'Request not found' };
    }

    if (guideRequest.request.city_id !== req.guideProfile.city_id) {
      return { error: 'Request is not in your city' };
    }

    if (guideRequest.status !== 'new' && guideRequest.status !== 'quoted') {
      return { error: 'Request is no longer accepting offers' };
    }

    // Check if guide already made an offer
    const existingOffer = await prisma.guideOffer.findFirst({
      where: {
        request_id: body.request_id,
        guide_id: req.user.id,
      },
    });

    if (existingOffer) {
      return { error: 'You have already made an offer for this request' };
    }

    const offer = await prisma.guideOffer.create({
      data: {
        request_id: body.request_id,
        guide_id: req.user.id,
        price: body.price,
        currency: body.currency || 'CNY',
        message: body.message || null,
        status: 'sent',
      },
      include: {
        guide: {
          include: {
            city: true,
            coverAsset: true,
          },
        },
      },
    });

    // Update request status if it was 'new'
    if (guideRequest.status === 'new') {
      await prisma.guideRequest.update({
        where: { request_id: body.request_id },
        data: { status: 'quoted' },
      });
    }

    return offer;
  });

  // Get guide's offers
  fastify.get('/offers', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireGuide(request, reply);
    if (reply.sent) return;
    const req = request as any;
    const { status } = request.query as { status?: string };

    const where: any = {
      guide_id: req.user.id,
    };

    if (status) {
      where.status = status;
    }

    const offers = await prisma.guideOffer.findMany({
      where,
      include: {
        request: {
          include: {
            request: {
              include: {
                category: true,
                city: true,
                user: {
                  select: { id: true, email: true, phone: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return offers;
  });
}

