/**
 * User Routes
 * 
 * Routes for authenticated users:
 * - Request guide service
 * - Request transport from CityPlace
 * - Accept guide offers
 * - Submit reviews
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { normalizeCategoryKey, getCategoryName } from '../utils/service-category.js';

// All user routes require authentication
async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const req = request as any;
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', requireAuth);

  // Request guide service (from CityPlace or manual)
  fastify.post('/guide-request', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as any;

    // Find or create service category
    let category = await prisma.serviceCategory.findUnique({
      where: { key: 'guide' },
    });

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { key: 'guide', name: 'Guide Service' },
      });
    }

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        category_id: category.id,
        city_id: body.city_id,
        user_id: req.user.id,
        status: 'new',
        customer_name: body.customer_name || req.user.email || 'User',
        phone: body.phone || req.user.phone || '',
        whatsapp: body.whatsapp || null,
        email: body.email || req.user.email || null,
        request_payload: {
          cityplace_id: body.cityplace_id || null,
          service_mode: body.service_mode || 'hourly',
          start_time: body.start_time || null,
          end_time: body.end_time || null,
          meeting_point: body.meeting_point || null,
          places: body.places || [],
          notes: body.notes || null,
          people_count: body.people_count || null,
          budget_min: body.budget_min || null,
          budget_max: body.budget_max || null,
        } as any,
      },
    });

    // Create guide request
    const guideRequest = await prisma.guideRequest.create({
      data: {
        request_id: serviceRequest.id,
        service_mode: body.service_mode || 'hourly',
        start_time: body.start_time ? new Date(body.start_time) : null,
        end_time: body.end_time ? new Date(body.end_time) : null,
        meeting_point: body.meeting_point || null,
        places: body.places || null,
        notes: body.notes || null,
        people_count: body.people_count || null,
        budget_min: body.budget_min || null,
        budget_max: body.budget_max || null,
        status: 'new',
      },
    });

    return {
      serviceRequest,
      guideRequest,
    };
  });

  // Request transport from CityPlace
  fastify.post('/request-transport-from-cityplace', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as any;

    // Find cityplace
    const cityplace = await prisma.cityPlace.findUnique({
      where: { id: body.cityplace_id },
      include: { city: true },
    });

    if (!cityplace) {
      return reply.status(404).send({ error: 'City place not found' });
    }

    // Find or create transport category
    let category = await prisma.serviceCategory.findUnique({
      where: { key: 'transport' },
    });

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { key: 'transport', name: 'Transport' },
      });
    }

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        category_id: category.id,
        city_id: cityplace.city_id,
        user_id: req.user.id,
        status: 'new',
        customer_name: body.customer_name || req.user.email || 'User',
        phone: body.phone || req.user.phone || '',
        whatsapp: body.whatsapp || null,
        email: body.email || req.user.email || null,
        request_payload: {
          cityplace_id: body.cityplace_id,
          type: body.type || 'point_to_point',
          pickup_text: body.pickup_text || cityplace.address,
          dropoff_text: body.dropoff_text || null,
          pickup_time: body.pickup_time || null,
          passengers: body.passengers || 1,
          luggage: body.luggage || 0,
        } as any,
      },
    });

    // Create transport booking
    const transportBooking = await prisma.transportBooking.create({
      data: {
        request_id: serviceRequest.id,
        type: body.type || 'point_to_point',
        pickup_text: body.pickup_text || cityplace.address,
        dropoff_text: body.dropoff_text || null,
        pickup_time: body.pickup_time ? new Date(body.pickup_time) : null,
        passengers: body.passengers || 1,
        luggage: body.luggage || 0,
      },
    });

    return {
      serviceRequest,
      transportBooking,
    };
  });

  // Get user's guide requests
  fastify.get('/guide-requests', async (request: FastifyRequest) => {
    const req = request as any;
    const { status } = request.query as { status?: string };

    const where: any = {
      request: {
        user_id: req.user.id,
      },
    };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.guideRequest.findMany({
      where,
      include: {
        request: {
          include: {
            category: true,
            city: true,
          },
        },
        offers: {
          include: {
            guide: {
              include: {
                city: true,
                coverAsset: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { request: { created_at: 'desc' } },
    });

    return requests;
  });

  // Accept a guide offer
  fastify.post('/guide-offers/:id/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };

    const offer = await prisma.guideOffer.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            request: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    // Verify user owns the request
    if (offer.request.request.user_id !== req.user.id) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (offer.status !== 'sent') {
      return reply.status(400).send({ error: 'Offer is not available for acceptance' });
    }

    // Accept the offer
    await prisma.guideOffer.update({
      where: { id },
      data: { status: 'accepted' },
    });

    // Reject other offers for the same request
    await prisma.guideOffer.updateMany({
      where: {
        request_id: offer.request_id,
        id: { not: id },
        status: 'sent',
      },
      data: { status: 'rejected' },
    });

    // Update guide request status
    await prisma.guideRequest.update({
      where: { request_id: offer.request_id },
      data: { status: 'assigned' },
    });

    // Update service request status
    await prisma.serviceRequest.update({
      where: { id: offer.request_id },
      data: {
        status: 'confirmed',
        assigned_to: offer.guide_id,
      },
    });

    return { message: 'Offer accepted', offer };
  });

  // Submit a review
  fastify.post('/reviews', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as any;

    // Validate entity_type
    const validTypes = ['hotel', 'restaurant', 'medical', 'tour', 'transport', 'cityplace', 'product', 'guide', 'food', 'esim'];
    if (!validTypes.includes(body.entity_type)) {
      return reply.status(400).send({ error: 'Invalid entity_type' });
    }

    // Validate rating
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user already reviewed this entity
    const existingReview = await prisma.review.findFirst({
      where: {
        user_id: req.user.id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
      },
    });

    if (existingReview) {
      return reply.status(400).send({ error: 'You have already reviewed this item' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        user_id: req.user.id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        rating: body.rating,
        title: body.title || null,
        comment: body.comment || null,
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    // Update entity rating and review count
    await updateEntityRating(body.entity_type, body.entity_id);

    return review;
  });

  // Get user's reviews
  fastify.get('/reviews', async (request: FastifyRequest) => {
    const req = request as any;
    const reviews = await prisma.review.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    return reviews;
  });

  // Get user's service requests
  fastify.get('/requests', async (request: FastifyRequest) => {
    const req = request as any;
    const requests = await prisma.serviceRequest.findMany({
      where: { user_id: req.user.id },
      include: {
        category: true,
        city: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return requests;
  });

  // Create service request from website (for logged-in users)
  const createServiceRequestSchema = z.object({
    categoryKey: z.string().min(1, 'Category is required'),
    citySlug: z.string().optional(),
    city_id: z.string().optional(),
    payload: z.record(z.any()).optional(),
    bundle_key: z.string().optional(), // Optional: for creating bundles
  });

  // Create bundle of service requests (multi-service)
  const createBundleRequestSchema = z.object({
    requests: z.array(z.object({
      categoryKey: z.string().min(1, 'Category is required'),
      city_id: z.string().optional(),
      citySlug: z.string().optional(),
      payload: z.record(z.any()).optional(),
    })).min(1, 'At least one request is required'),
    city_id: z.string().optional(), // Default city for all requests if not specified
  });

  fastify.post('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = createServiceRequestSchema.parse(request.body);

    // Find or create category
    let category = await prisma.serviceCategory.findUnique({
      where: { key: body.categoryKey },
    });

    if (!category) {
      // Normalize category key (handles variations like "shopping_service" → "shopping")
      const normalizedKey = normalizeCategoryKey(body.categoryKey);
      if (!normalizedKey) {
        reply.status(400).send({ error: `Invalid category key: ${body.categoryKey}` });
        return;
      }

      category = await prisma.serviceCategory.create({
        data: {
          key: normalizedKey,
          name: getCategoryName(normalizedKey),
        },
      });
    }

    // Resolve city_id from slug or use provided city_id
    let cityId = body.city_id;
    if (!cityId && body.citySlug) {
      const city = await prisma.city.findFirst({
        where: { slug: body.citySlug },
      });
      if (city) {
        cityId = city.id;
      }
    }

    // Default to Guangzhou if no city specified
    if (!cityId) {
      const defaultCity = await prisma.city.findFirst({
        where: { slug: 'guangzhou' },
      });
      if (defaultCity) {
        cityId = defaultCity.id;
      } else {
        reply.status(400).send({ error: 'City is required' });
        return;
      }
    }

    // Get user profile for contact info
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        customerProfile: true,
      },
    });

    // Build request payload with source metadata
    const requestPayload = {
      ...(body.payload || {}),
      source: 'web_form',
      created_via: 'service_page',
    };

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        category_id: category.id,
        city_id: cityId,
        user_id: req.user.id,
        customer_name: user?.customerProfile?.full_name || user?.email || 'User',
        phone: user?.phone || '',
        whatsapp: user?.customerProfile?.wechat_id || null,
        email: user?.email || null,
        request_payload: requestPayload,
        status: 'new',
      },
    });

    // Create category-specific booking record if needed
    if (body.categoryKey === 'hotel' && body.payload) {
      const payload = body.payload as any;
      if (payload.checkin || payload.checkout) {
        await prisma.hotelBooking.create({
          data: {
            request_id: serviceRequest.id,
            checkin: payload.checkin ? new Date(payload.checkin) : null,
            checkout: payload.checkout ? new Date(payload.checkout) : null,
            guests: payload.guests || null,
            rooms: payload.rooms || null,
            adults: payload.adults || 1,
            room_qty: payload.room_qty || payload.rooms || 1,
            budget_min: payload.budget_min || null,
            budget_max: payload.budget_max || null,
            preferred_area: payload.preferred_area || null,
            hotel_id: payload.hotel_id || null,
          },
        });
      }
    } else if (body.categoryKey === 'transport' && body.payload) {
      const payload = body.payload as any;
      if (payload.pickup_text && payload.dropoff_text) {
        await prisma.transportBooking.create({
          data: {
            request_id: serviceRequest.id,
            type: payload.type || 'pickup',
            pickup_text: payload.pickup_text,
            dropoff_text: payload.dropoff_text,
            pickup_time: payload.pickup_time ? new Date(payload.pickup_time) : null,
            passengers: payload.passengers || 1,
            luggage: payload.luggage || 0,
          },
        });
      }
    }

    return {
      id: serviceRequest.id,
      status: serviceRequest.status,
      message: 'Service request created successfully',
    };
  });

  // Get user's orders
  fastify.get('/orders', async (request: FastifyRequest) => {
    const req = request as any;
    const orders = await prisma.order.findMany({
      where: { user_id: req.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: {
          include: {
            city: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return orders;
  });

  // Get specific service request detail
  fastify.get('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        providerOffers: {
          where: { status: { in: ['approved', 'sent_to_user'] } },
          orderBy: { submitted_at: 'desc' },
          take: 1,
        },
        paymentProofs: {
          include: {
            asset: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        statusEvents: {
          select: {
            id: true,
            status_from: true,
            status_to: true,
            note_user: true, // Only user-facing notes
            created_at: true,
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
      reply.status(404).send({ error: 'Request not found' });
      return;
    }

    if (serviceRequest.user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    // Get sibling requests if bundle_key exists
    let bundleRequests: any[] = [];
    if (serviceRequest.bundle_key) {
      bundleRequests = await prisma.serviceRequest.findMany({
        where: {
          bundle_key: serviceRequest.bundle_key,
          user_id: req.user.id,
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
      ...serviceRequest,
      bundleRequests,
    };
  });

  // Get user profile
  fastify.get('/profile', async (request: FastifyRequest) => {
    const req = request as any;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        customerProfile: {
          include: {
            avatarAsset: true,
          },
        },
      },
    });
    return user;
  });

  // Update user profile
  fastify.patch('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as { 
      phone?: string;
      customerProfile?: {
        nationality?: string;
        passport_name?: string;
        preferred_language?: string;
        full_name?: string;
        gender?: string;
        birth_year?: number;
        country_of_residence?: string;
        city_of_residence?: string;
        preferred_currency?: string;
        preferred_contact_channel?: string;
        wechat_id?: string;
        dietary_preferences?: any;
        travel_interests?: any;
        budget_preferences?: any;
        marketing_consent?: boolean;
        avatar_asset_id?: string | null;
      };
    };

    const updateData: any = {};
    if (body.phone !== undefined) updateData.phone = body.phone;

    // Update user basic info
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        customerProfile: {
          include: {
            avatarAsset: true,
          },
        },
      },
    });

    // Upsert customer profile if provided
    if (body.customerProfile) {
      const profileUpdateData: any = {};
      if (body.customerProfile.nationality !== undefined) {
        profileUpdateData.nationality = body.customerProfile.nationality || null;
      }
      if (body.customerProfile.passport_name !== undefined) {
        profileUpdateData.passport_name = body.customerProfile.passport_name || null;
      }
      if (body.customerProfile.preferred_language !== undefined) {
        profileUpdateData.preferred_language = body.customerProfile.preferred_language || null;
      }
      if (body.customerProfile.full_name !== undefined) {
        profileUpdateData.full_name = body.customerProfile.full_name || null;
      }
      if (body.customerProfile.gender !== undefined) {
        profileUpdateData.gender = body.customerProfile.gender || null;
      }
      if (body.customerProfile.birth_year !== undefined) {
        profileUpdateData.birth_year = body.customerProfile.birth_year || null;
      }
      if (body.customerProfile.country_of_residence !== undefined) {
        profileUpdateData.country_of_residence = body.customerProfile.country_of_residence || null;
      }
      if (body.customerProfile.city_of_residence !== undefined) {
        profileUpdateData.city_of_residence = body.customerProfile.city_of_residence || null;
      }
      if (body.customerProfile.preferred_currency !== undefined) {
        profileUpdateData.preferred_currency = body.customerProfile.preferred_currency || null;
      }
      if (body.customerProfile.preferred_contact_channel !== undefined) {
        profileUpdateData.preferred_contact_channel = body.customerProfile.preferred_contact_channel || null;
      }
      if (body.customerProfile.wechat_id !== undefined) {
        profileUpdateData.wechat_id = body.customerProfile.wechat_id || null;
      }
      if (body.customerProfile.dietary_preferences !== undefined) {
        profileUpdateData.dietary_preferences = body.customerProfile.dietary_preferences || null;
      }
      if (body.customerProfile.travel_interests !== undefined) {
        profileUpdateData.travel_interests = body.customerProfile.travel_interests || null;
      }
      if (body.customerProfile.budget_preferences !== undefined) {
        profileUpdateData.budget_preferences = body.customerProfile.budget_preferences || null;
      }
      if (body.customerProfile.marketing_consent !== undefined) {
        profileUpdateData.marketing_consent = body.customerProfile.marketing_consent;
      }
      if (body.customerProfile.avatar_asset_id !== undefined) {
        profileUpdateData.avatar_asset_id = body.customerProfile.avatar_asset_id || null;
      }

      await prisma.customerProfile.upsert({
        where: { user_id: req.user.id },
        update: profileUpdateData,
        create: {
          user_id: req.user.id,
          nationality: body.customerProfile.nationality || null,
          passport_name: body.customerProfile.passport_name || null,
          preferred_language: body.customerProfile.preferred_language || null,
          full_name: body.customerProfile.full_name || null,
          gender: body.customerProfile.gender || null,
          birth_year: body.customerProfile.birth_year || null,
          country_of_residence: body.customerProfile.country_of_residence || null,
          city_of_residence: body.customerProfile.city_of_residence || null,
          preferred_currency: body.customerProfile.preferred_currency || null,
          preferred_contact_channel: body.customerProfile.preferred_contact_channel || null,
          wechat_id: body.customerProfile.wechat_id || null,
          dietary_preferences: body.customerProfile.dietary_preferences || null,
          travel_interests: body.customerProfile.travel_interests || null,
          budget_preferences: body.customerProfile.budget_preferences || null,
          marketing_consent: body.customerProfile.marketing_consent || false,
          avatar_asset_id: body.customerProfile.avatar_asset_id || null,
        },
      });

      // Reload user with updated profile
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          phone: true,
          customerProfile: {
            include: {
              avatarAsset: true,
            },
          },
        },
      });
      return updatedUser;
    }

    return user;
  });

  // Get user addresses
  fastify.get('/addresses', async (request: FastifyRequest) => {
    const req = request as any;
    const addresses = await prisma.address.findMany({
      where: { user_id: req.user.id },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    // Map to frontend format for compatibility
    return addresses.map(addr => {
      const postalCode = addr.notes?.match(/Postal Code:\s*(.+)/)?.[1] || null;
      return {
        ...addr,
        label: addr.name,
        street: addr.address_line,
        city: addr.city.name,
        postal_code: postalCode,
      };
    });
  });

  // Create address
  fastify.post('/addresses', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as {
      // Frontend format (for compatibility)
      label?: string;
      street?: string;
      city?: string;
      postal_code?: string;
      // Backend format (direct)
      name?: string;
      phone?: string;
      address_line?: string;
      city_id?: string;
      geo_lat?: number;
      geo_lng?: number;
      notes?: string;
    };

    // Map frontend format to backend format
    const addressLine = body.address_line || body.street;
    const name = body.name || body.label || 'Default';
    const cityName = body.city;
    const cityId = body.city_id;

    if (!addressLine) {
      reply.status(400).send({ error: 'Street address is required' });
      return;
    }

    // Resolve city_id from city name if provided
    let resolvedCityId = cityId;
    if (!resolvedCityId && cityName) {
      const city = await prisma.city.findFirst({
        where: {
          OR: [
            { name: { equals: cityName, mode: 'insensitive' } },
            { slug: { equals: cityName.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
          ],
        },
      });
      if (!city) {
        reply.status(400).send({ error: `City "${cityName}" not found` });
        return;
      }
      resolvedCityId = city.id;
    }

    if (!resolvedCityId) {
      reply.status(400).send({ error: 'City ID or city name is required' });
      return;
    }

    // Combine notes with postal code if provided
    const notes = body.notes || (body.postal_code ? `Postal Code: ${body.postal_code}` : null);

    const address = await prisma.address.create({
      data: {
        user_id: req.user.id,
        name: name,
        phone: body.phone || req.user.phone || '',
        address_line: addressLine,
        city_id: resolvedCityId,
        geo_lat: body.geo_lat || null,
        geo_lng: body.geo_lng || null,
        notes: notes,
      },
      include: {
        city: true,
      },
    });

    return address;
  });

  // Delete address
  fastify.delete('/addresses/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };

    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      reply.status(404).send({ error: 'Address not found' });
      return;
    }

    if (address.user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    await prisma.address.delete({
      where: { id },
    });

    return { message: 'Address deleted' };
  });

  // Upload media file (for payment proofs and other user uploads)
  fastify.post('/media/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    
    try {
      // Check R2 configuration
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
        return reply.status(500).send({ 
          error: 'File upload not configured' 
        });
      }

      // Parse multipart form data
      let fileData: any = null;
      const parts = request.parts();
      
      for await (const part of parts) {
        if (part.type === 'file') {
          fileData = part;
          break; // Only handle single file for now
        }
      }

      if (!fileData) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Read file buffer
      const chunks: Buffer[] = [];
      for await (const chunk of fileData.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Validate file size (5MB max for payment proofs)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (fileBuffer.length > maxSize) {
        return reply.status(400).send({ error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` });
      }

      // Upload to R2
      const { uploadToR2, getPublicUrl } = await import('../utils/r2.js');
      const timestamp = Date.now();
      const sanitizedFilename = fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/payment-proofs/${timestamp}-${sanitizedFilename}`;

      await uploadToR2(key, fileBuffer, fileData.mimetype);
      const publicUrl = getPublicUrl(key);

      // Create media asset record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          r2_key: key,
          public_url: publicUrl,
          mime_type: fileData.mimetype,
          size: fileBuffer.length,
          category: 'payment_proof',
          uploaded_by: req.user.id,
        },
      });

      return mediaAsset;
    } catch (error: any) {
      fastify.log.error({ error }, '[User Route] /media/upload error');
      return reply.status(500).send({ 
        error: error.message || 'Failed to upload file'
      });
    }
  });

  // Upload payment proof
  fastify.post('/requests/:id/payment-proof', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = request.body as {
      asset_id: string;
      notes?: string;
    };

    if (!body.asset_id) {
      reply.status(400).send({ error: 'asset_id is required' });
      return;
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Request not found' });
      return;
    }

    if (serviceRequest.user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    const paymentProof = await prisma.paymentProof.create({
      data: {
        request_id: id,
        asset_id: body.asset_id,
        notes: body.notes || null,
        status: 'submitted',
      },
      include: {
        asset: true,
      },
    });

    return paymentProof;
  });

  // Get payment proof
  fastify.get('/requests/:id/payment-proof', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Request not found' });
      return;
    }

    if (serviceRequest.user_id !== req.user.id) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }

    const paymentProof = await prisma.paymentProof.findFirst({
      where: { request_id: id },
      include: {
        asset: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!paymentProof) {
      reply.status(404).send({ error: 'Payment proof not found' });
      return;
    }

    return paymentProof;
  });

  // Purchase eSIM plan
  fastify.post('/esim/purchase', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as {
      plan_id: string;
      customer_name: string;
      phone: string;
      email?: string;
    };

    try {
      // Find or create esim service category
      let category = await prisma.serviceCategory.findUnique({
        where: { key: 'esim' },
      });

      if (!category) {
        category = await prisma.serviceCategory.create({
          data: { key: 'esim', name: 'eSIM Plan' },
        });
      }

      // Get the esim plan
      const esimPlan = await prisma.esimPlan.findUnique({
        where: { id: body.plan_id },
      });

      if (!esimPlan) {
        reply.status(404).send({ error: 'eSIM plan not found' });
        return;
      }

      // Get default city (Guangzhou) or use first city
      const defaultCity = await prisma.city.findFirst({
        where: { slug: 'guangzhou' },
      }) || await prisma.city.findFirst();

      if (!defaultCity) {
        reply.status(500).send({ error: 'No city configured' });
        return;
      }

      // Create service request
      const serviceRequest = await prisma.serviceRequest.create({
        data: {
          category_id: category.id,
          city_id: defaultCity.id,
          user_id: req.user.id,
          status: 'new',
          customer_name: body.customer_name,
          phone: body.phone,
          email: body.email || req.user.email || null,
          request_payload: {
            type: 'esim_purchase',
            plan_id: body.plan_id,
            plan_name: esimPlan.name,
            plan_price: esimPlan.price,
            plan_currency: esimPlan.currency,
            plan_data: esimPlan.data_text,
            plan_validity_days: esimPlan.validity_days,
            plan_region: esimPlan.region_text,
            plan_provider: esimPlan.provider,
          },
        },
      });

      return {
        success: true,
        message: 'eSIM purchase request submitted successfully',
        request_id: serviceRequest.id,
      };
    } catch (error: any) {
      fastify.log.error({ error, body }, '[User Route] /esim/purchase error');
      reply.status(500).send({ error: error.message || 'Failed to process purchase' });
    }
  });
}

// Helper function to update entity rating
async function updateEntityRating(entityType: string, entityId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      entity_type: entityType,
      entity_id: entityId,
    },
  });

  if (reviews.length === 0) return;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const reviewCount = reviews.length;

  // Update the appropriate entity table
  switch (entityType) {
    case 'hotel':
      await prisma.hotel.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'restaurant':
      await prisma.restaurant.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'food':
      // Food items don't have rating/review_count fields, skip
      break;
    case 'esim':
      // eSIM plans don't have rating/review_count fields, skip
      break;
    case 'medical':
      await prisma.medicalCenter.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'tour':
      await prisma.tour.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'transport':
      await prisma.transportProduct.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'cityplace':
      await prisma.cityPlace.update({
        where: { id: entityId },
        data: { star_rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'product':
      await prisma.product.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
    case 'guide':
      await prisma.guideProfile.update({
        where: { id: entityId },
        data: { rating: avgRating, review_count: reviewCount },
      });
      break;
  }
}
