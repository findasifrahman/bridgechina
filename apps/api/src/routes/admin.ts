import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { updateServiceRequestStatusSchema, updateLeadSchema } from '@bridgechina/shared';

export default async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication and ADMIN/OPS/EDITOR role
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('ADMIN', 'OPS', 'EDITOR'));

  // Get service categories (for dropdowns, etc.)
  fastify.get('/service-categories', async () => {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return categories;
  });

  // Fix existing media asset URLs (remove bucket name from path)
  fastify.post('/media/fix-urls', async () => {
    const { getPublicUrl } = await import('../utils/image-processor.js');
    
    const allAssets = await prisma.mediaAsset.findMany({
      select: {
        id: true,
        r2_key: true,
        thumbnail_key: true,
        public_url: true,
        thumbnail_url: true,
      },
    });

    let fixed = 0;
    let errors = 0;

    for (const asset of allAssets) {
      try {
        // Regenerate URLs without bucket name
        const newPublicUrl = getPublicUrl(asset.r2_key);
        const newThumbnailUrl = asset.thumbnail_key ? getPublicUrl(asset.thumbnail_key) : null;

        // Only update if URLs have changed
        if (asset.public_url !== newPublicUrl || asset.thumbnail_url !== newThumbnailUrl) {
          await prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
              public_url: newPublicUrl,
              thumbnail_url: newThumbnailUrl,
            },
          });
          fixed++;
          console.log(`[Fix URLs] Updated asset ${asset.id}: ${newPublicUrl}`);
        }
      } catch (error: any) {
        console.error(`[Fix URLs] Error updating asset ${asset.id}:`, error);
        errors++;
      }
    }

    return {
      message: `Fixed ${fixed} URLs, ${errors} errors`,
      total: allAssets.length,
      fixed,
      errors,
    };
  });

  // Dashboard stats
  fastify.get('/dashboard', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [leadsToday, leadsWeek, requestsByCategory, requestsByStatus, ordersSummary] = await Promise.all([
      prisma.lead.count({
        where: {
          created_at: { gte: today },
        },
      }),
      prisma.lead.count({
        where: {
          created_at: { gte: weekAgo },
        },
      }),
      prisma.serviceRequest.groupBy({
        by: ['category_id'],
        _count: true,
        where: {
          created_at: { gte: weekAgo },
        },
      }),
      prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.order.aggregate({
        _sum: {
          total: true,
        },
        _count: true,
        where: {
          created_at: { gte: weekAgo },
        },
      }),
    ]);

    return {
      leads: {
        today: leadsToday,
        week: leadsWeek,
      },
      requests: {
        byCategory: requestsByCategory,
        byStatus: requestsByStatus,
      },
      orders: ordersSummary,
    };
  });

  // Leads CRUD
  fastify.get('/leads', async (request: FastifyRequest) => {
    const { status, owner_id } = request.query as { status?: string; owner_id?: string };
    const leads = await prisma.lead.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(owner_id ? { owner_id } : {}),
      },
      include: {
        city: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return leads;
  });

  fastify.get('/leads/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        city: true,
        owner: true,
        serviceRequests: true,
      },
    });

    if (!lead) {
      reply.status(404).send({ error: 'Lead not found' });
      return;
    }

    return lead;
  });

  fastify.patch('/leads/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateLeadSchema.parse(request.body);

    const lead = await prisma.lead.update({
      where: { id },
      data: body,
    });

    return lead;
  });

  // Service Requests
  fastify.get('/requests', async (request: FastifyRequest) => {
    const { status, category_id, assigned_to } = request.query as {
      status?: string;
      category_id?: string;
      assigned_to?: string;
    };

    const requests = await prisma.serviceRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category_id ? { category_id } : {}),
        ...(assigned_to ? { assigned_to } : {}),
      },
      include: {
        category: true,
        city: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return requests;
  });

  fastify.get('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        user: true,
        assignedUser: true,
        hotelBooking: true,
        transportBooking: true,
        foodDelivery: true,
        medicalAssist: true,
        translationTask: true,
        tourBooking: true,
      },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Request not found' });
      return;
    }

    return serviceRequest;
  });

  fastify.patch('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateServiceRequestStatusSchema.parse(request.body);
    const req = request as any;

    const serviceRequest = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: body.status,
        assigned_to: body.assigned_to || undefined,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        entity_type: 'service_request',
        entity_id: id,
        message: `Status updated to ${body.status}`,
        created_by: req.user.id,
      },
    });

    return serviceRequest;
  });

  // Approve payment proof
  fastify.post('/requests/:id/payment-proof/:proofId/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: requestId, proofId } = request.params as { id: string; proofId: string };
    const req = request as any;

    // Verify service request exists
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Service request not found' });
      return;
    }

    // Verify payment proof exists and belongs to this request
    const paymentProof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
    });

    if (!paymentProof) {
      reply.status(404).send({ error: 'Payment proof not found' });
      return;
    }

    if (paymentProof.request_id !== requestId) {
      reply.status(400).send({ error: 'Payment proof does not belong to this request' });
      return;
    }

    // Update payment proof status
    const updatedProof = await prisma.paymentProof.update({
      where: { id: proofId },
      data: {
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
      },
      include: {
        asset: true,
        reviewer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        entity_type: 'payment_proof',
        entity_id: proofId,
        message: 'Payment proof approved',
        created_by: req.user.id,
      },
    });

    return updatedProof;
  });

  // Reject payment proof
  fastify.post('/requests/:id/payment-proof/:proofId/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: requestId, proofId } = request.params as { id: string; proofId: string };
    const req = request as any;
    const body = request.body as { reason?: string };

    // Verify service request exists
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!serviceRequest) {
      reply.status(404).send({ error: 'Service request not found' });
      return;
    }

    // Verify payment proof exists and belongs to this request
    const paymentProof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
    });

    if (!paymentProof) {
      reply.status(404).send({ error: 'Payment proof not found' });
      return;
    }

    if (paymentProof.request_id !== requestId) {
      reply.status(400).send({ error: 'Payment proof does not belong to this request' });
      return;
    }

    // Update payment proof status
    const updatedProof = await prisma.paymentProof.update({
      where: { id: proofId },
      data: {
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        notes: body.reason || paymentProof.notes || null,
      },
      include: {
        asset: true,
        reviewer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        entity_type: 'payment_proof',
        entity_id: proofId,
        message: `Payment proof rejected${body.reason ? `: ${body.reason}` : ''}`,
        created_by: req.user.id,
      },
    });

    return updatedProof;
  });

  // Payments
  fastify.get('/payments', async (request: FastifyRequest) => {
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return payments;
  });

  fastify.post('/payments', async (request: FastifyRequest) => {
    const body = request.body as any;
    const req = request as any;

    const payment = await prisma.payment.create({
      data: {
        user_id: body.user_id || null,
        lead_id: body.lead_id || null,
        related_type: body.related_type,
        related_id: body.related_id,
        method: body.method,
        amount: body.amount,
        currency: body.currency || 'CNY',
        status: body.status || 'pending',
        received_by: req.user.id,
        receipt_no: body.receipt_no || null,
        notes: body.notes || null,
      },
    });

    return payment;
  });

  // Catalog management - Cities
  fastify.get('/catalog/cities', async () => {
    const cities = await prisma.city.findMany({ 
      include: {
        coverAsset: true,
      },
      orderBy: { name: 'asc' } 
    });

    // Load gallery assets for each city
    const citiesWithGallery = await Promise.all(
      cities.map(async (city) => {
        const galleryIds = (city.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...city,
          galleryAssets,
        };
      })
    );

    return citiesWithGallery;
  });

  fastify.post('/catalog/cities', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id || null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || null);

    const city = await prisma.city.create({
      data: {
        name: body.name,
        slug: body.slug,
        country: body.country || 'China',
        is_active: body.is_active !== undefined ? body.is_active : true,
        description: body.description,
        highlights: body.highlights as any,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (city.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...city,
      galleryAssets,
    };
  });

  fastify.put('/catalog/cities/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const city = await prisma.city.update({
      where: { id: params.id },
      data: {
        name: body.name,
        slug: body.slug,
        country: body.country,
        is_active: body.is_active,
        description: body.description,
        highlights: body.highlights as any,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (city.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...city,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/cities/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.city.delete({ where: { id: params.id } });
    return { message: 'City deleted' };
  });

  // Hotels
  fastify.get('/catalog/hotels', async (request: FastifyRequest) => {
    const { search, city_id, verified, page = '1', limit = '50', sort = 'name' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (verified !== undefined) where.verified = verified === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'price') orderBy.price_from = 'asc';
    else orderBy.created_at = 'desc';

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.hotel.count({ where }),
    ]);

    // Load gallery assets
    const hotelsWithGallery = await Promise.all(
      hotels.map(async (hotel) => {
        const galleryIds = (hotel.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...hotel,
          galleryAssets,
        };
      })
    );

    return {
      data: hotelsWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/hotels', async (request: FastifyRequest) => {
    const body = request.body as any;
    const req = request as any;
    
    const hotel = await prisma.hotel.create({
      data: {
        city_id: body.city_id,
        name: body.name,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        price_from: body.price_from,
        price_to: body.price_to,
        currency: body.currency || 'CNY',
        verified: body.verified || false,
        rating: body.rating,
        review_count: body.review_count || 0,
        star_rating: body.star_rating,
        description: body.description,
        amenities: body.amenities as any,
        facilities: body.facilities as any,
        checkin_time: body.checkin_time,
        checkout_time: body.checkout_time,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        cover_asset_id: body.image_ids && body.image_ids.length > 0 ? body.image_ids[0] : (body.cover_asset_id || null),
        gallery_asset_ids: body.image_ids && body.image_ids.length > 1 ? body.image_ids.slice(1) : (body.gallery_asset_ids || null),
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (hotel.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...hotel,
      galleryAssets,
    };
  });

  fastify.put('/catalog/hotels/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const hotel = await prisma.hotel.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        name: body.name,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        price_from: body.price_from,
        price_to: body.price_to,
        currency: body.currency,
        verified: body.verified,
        rating: body.rating,
        review_count: body.review_count,
        star_rating: body.star_rating,
        description: body.description,
        amenities: body.amenities as any,
        facilities: body.facilities as any,
        checkin_time: body.checkin_time,
        checkout_time: body.checkout_time,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (hotel.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...hotel,
      galleryAssets,
    };
  });

  // External Hotels (read-only view)
  fastify.get('/catalog/external-hotels', async (request: FastifyRequest) => {
    const { search, city, page = '1', limit = '50' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      provider: 'bookingcom',
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [hotels, total] = await Promise.all([
      (prisma as any).externalHotel.findMany({
        where,
        orderBy: { last_synced_at: 'desc' },
        skip,
        take: limitNum,
      }),
      (prisma as any).externalHotel.count({ where }),
    ]);

    return {
      data: hotels,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  // External Hotel Search Cache (read-only view with refresh action)
  fastify.get('/catalog/external-hotel-cache', async (request: FastifyRequest) => {
    const { provider = 'bookingcom', page = '1', limit = '50' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { provider };

    const [cache, total] = await Promise.all([
      (prisma as any).externalHotelSearchCache.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      (prisma as any).externalHotelSearchCache.count({ where }),
    ]);

    return {
      data: cache,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  // Refresh external hotel cache (delete old entries)
  fastify.post('/catalog/external-hotel-cache/refresh', async (request: FastifyRequest) => {
    // Delete cache entries older than 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    
    const deleted = await (prisma as any).externalHotelSearchCache.deleteMany({
      where: {
        created_at: {
          lt: fiveDaysAgo,
        },
      },
    });

    return {
      message: `Deleted ${deleted.count} expired cache entries`,
      deleted: deleted.count,
    };
  });

  fastify.delete('/catalog/hotels/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.hotel.delete({ where: { id: params.id } });
    return { message: 'Hotel deleted' };
  });

  // Restaurants
  fastify.get('/catalog/restaurants', async (request: FastifyRequest) => {
    const { search, city_id, halal_verified, page = '1', limit = '50', sort = 'name' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (halal_verified !== undefined) where.halal_verified = halal_verified === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else orderBy.created_at = 'desc';

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.restaurant.count({ where }),
    ]);

    // Load gallery assets
    const restaurantsWithGallery = await Promise.all(
      restaurants.map(async (restaurant) => {
        const galleryIds = (restaurant.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...restaurant,
          galleryAssets,
        };
      })
    );

    return {
      data: restaurantsWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/restaurants', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id || null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || null);

    const restaurant = await prisma.restaurant.create({
      data: {
        city_id: body.city_id,
        name: body.name,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        halal_verified: body.halal_verified || false,
        delivery_supported: body.delivery_supported || false,
        rating: body.rating,
        review_count: body.review_count || 0,
        cuisine_type: body.cuisine_type,
        price_range: body.price_range,
        opening_hours: body.opening_hours as any,
        description: body.description,
        specialties: body.specialties as any,
        amenities: body.amenities as any,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (restaurant.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...restaurant,
      galleryAssets,
    };
  });

  fastify.put('/catalog/restaurants/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const restaurant = await prisma.restaurant.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        name: body.name,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        halal_verified: body.halal_verified,
        delivery_supported: body.delivery_supported,
        rating: body.rating,
        review_count: body.review_count,
        cuisine_type: body.cuisine_type,
        price_range: body.price_range,
        opening_hours: body.opening_hours as any,
        description: body.description,
        specialties: body.specialties as any,
        amenities: body.amenities as any,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (restaurant.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...restaurant,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/restaurants/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.restaurant.delete({ where: { id: params.id } });
    return { message: 'Restaurant deleted' };
  });

  // Medical Centers
  fastify.get('/catalog/medical', async (request: FastifyRequest) => {
    const { search, city_id, type, verified, page = '1', limit = '50', sort = 'name' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (type) where.type = type;
    if (verified !== undefined) where.verified = verified === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else orderBy.created_at = 'desc';

    const [medicalCenters, total] = await Promise.all([
      prisma.medicalCenter.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.medicalCenter.count({ where }),
    ]);

    // Load gallery assets
    const medicalCentersWithGallery = await Promise.all(
      medicalCenters.map(async (medical) => {
        const galleryIds = (medical.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...medical,
          galleryAssets,
        };
      })
    );

    return {
      data: medicalCentersWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/medical', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id || null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || null);

    const medical = await prisma.medicalCenter.create({
      data: {
        city_id: body.city_id,
        name: body.name,
        type: body.type,
        languages: body.languages as any,
        verified: body.verified || false,
        rating: body.rating,
        review_count: body.review_count || 0,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        specialties: body.specialties as any,
        services: body.services as any,
        opening_hours: body.opening_hours as any,
        emergency_available: body.emergency_available || false,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        description: body.description,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (medical.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...medical,
      galleryAssets,
    };
  });

  fastify.put('/catalog/medical/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const medical = await prisma.medicalCenter.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        name: body.name,
        type: body.type,
        languages: body.languages as any,
        verified: body.verified,
        rating: body.rating,
        review_count: body.review_count,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        specialties: body.specialties as any,
        services: body.services as any,
        opening_hours: body.opening_hours as any,
        emergency_available: body.emergency_available,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        website: body.website,
        description: body.description,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (medical.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...medical,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/medical/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.medicalCenter.delete({ where: { id: params.id } });
    return { message: 'Medical center deleted' };
  });

  // Tours
  fastify.get('/catalog/tours', async (request: FastifyRequest) => {
    const { search, city_id, page = '1', limit = '50', sort = 'name' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'price') orderBy.price_from = 'asc';
    else orderBy.created_at = 'desc';

    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.tour.count({ where }),
    ]);

    // Load gallery assets
    const toursWithGallery = await Promise.all(
      tours.map(async (tour) => {
        const galleryIds = (tour.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...tour,
          galleryAssets,
        };
      })
    );

    return {
      data: toursWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/tours', async (request: FastifyRequest) => {
    const body = request.body as any;
    const tour = await prisma.tour.create({
      data: {
        city_id: body.city_id,
        name: body.name,
        duration_text: body.duration_text,
        duration_hours: body.duration_hours,
        price_from: body.price_from,
        price_to: body.price_to,
        currency: body.currency || 'CNY',
        rating: body.rating,
        review_count: body.review_count || 0,
        description: body.description,
        highlights: body.highlights as any,
        inclusions: body.inclusions as any,
        exclusions: body.exclusions as any,
        meeting_point: body.meeting_point,
        cancellation_policy: body.cancellation_policy,
        languages: body.languages as any,
        max_group_size: body.max_group_size,
        min_group_size: body.min_group_size,
        cover_asset_id: body.image_ids && body.image_ids.length > 0 ? body.image_ids[0] : (body.cover_asset_id || null),
        gallery_asset_ids: body.image_ids && body.image_ids.length > 1 ? body.image_ids.slice(1) : (body.gallery_asset_ids || null),
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (tour.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...tour,
      galleryAssets,
    };
  });

  fastify.put('/catalog/tours/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const tour = await prisma.tour.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        name: body.name,
        duration_text: body.duration_text,
        duration_hours: body.duration_hours,
        price_from: body.price_from,
        price_to: body.price_to,
        currency: body.currency,
        rating: body.rating,
        review_count: body.review_count,
        description: body.description,
        highlights: body.highlights as any,
        inclusions: body.inclusions as any,
        exclusions: body.exclusions as any,
        meeting_point: body.meeting_point,
        cancellation_policy: body.cancellation_policy,
        languages: body.languages as any,
        max_group_size: body.max_group_size,
        min_group_size: body.min_group_size,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (tour.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...tour,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/tours/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.tour.delete({ where: { id: params.id } });
    return { message: 'Tour deleted' };
  });

  // Transport Products
  fastify.get('/catalog/transport', async (request: FastifyRequest) => {
    const { search, city_id, type, page = '1', limit = '50', sort = 'created_at' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (type) where.type = type;

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'price') orderBy.base_price = 'asc';
    else orderBy.created_at = 'desc';

    const [transports, total] = await Promise.all([
      prisma.transportProduct.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.transportProduct.count({ where }),
    ]);

    // Load gallery assets
    const transportsWithGallery = await Promise.all(
      transports.map(async (transport) => {
        const galleryIds = (transport.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...transport,
          galleryAssets,
        };
      })
    );

    return {
      data: transportsWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/transport', async (request: FastifyRequest) => {
    const body = request.body as any;
    const transport = await prisma.transportProduct.create({
      data: {
        city_id: body.city_id,
        type: body.type,
        name: body.name,
        base_price: body.base_price,
        price_per_km: body.price_per_km,
        currency: body.currency || 'CNY',
        vehicle_type: body.vehicle_type,
        capacity: body.capacity,
        rating: body.rating,
        review_count: body.review_count || 0,
        description: body.description,
        features: body.features as any,
        rules: body.rules as any,
        cover_asset_id: body.image_ids && body.image_ids.length > 0 ? body.image_ids[0] : (body.cover_asset_id || null),
        gallery_asset_ids: body.image_ids && body.image_ids.length > 1 ? body.image_ids.slice(1) : (body.gallery_asset_ids || null),
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (transport.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...transport,
      galleryAssets,
    };
  });

  fastify.put('/catalog/transport/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const transport = await prisma.transportProduct.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        type: body.type,
        name: body.name,
        base_price: body.base_price,
        price_per_km: body.price_per_km,
        currency: body.currency,
        vehicle_type: body.vehicle_type,
        capacity: body.capacity,
        rating: body.rating,
        review_count: body.review_count,
        description: body.description,
        features: body.features as any,
        rules: body.rules as any,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (transport.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...transport,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/transport/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.transportProduct.delete({ where: { id: params.id } });
    return { message: 'Transport product deleted' };
  });

  // Shopping - Categories
  fastify.get('/shopping/categories', async () => {
    return prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
  });

  fastify.post('/shopping/categories', async (request: FastifyRequest) => {
    const body = request.body as any;
    const category = await prisma.productCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        parent_id: body.parent_id || null,
      },
    });
    return category;
  });

  fastify.put('/shopping/categories/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    const category = await prisma.productCategory.update({
      where: { id: params.id },
      data: {
        name: body.name,
        slug: body.slug,
        parent_id: body.parent_id || null,
      },
    });
    return category;
  });

  fastify.delete('/shopping/categories/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.productCategory.delete({ where: { id: params.id } });
    return { message: 'Category deleted' };
  });

  // Shopping - Products
  fastify.get('/shopping/products', async () => {
    const products = await prisma.product.findMany({
      include: {
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
        category: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Load gallery assets
    const productsWithGallery = await Promise.all(
      products.map(async (product) => {
        const galleryIds = (product.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...product,
          galleryAssets,
        };
      })
    );

    return productsWithGallery;
  });

  fastify.post('/shopping/products', async (request: FastifyRequest) => {
    const body = request.body as any;
    const req = request as any;
    const product = await prisma.product.create({
      data: {
        seller_id: body.seller_id || req.user.id,
        category_id: body.category_id,
        title: body.title,
        description: body.description,
        price: body.price,
        original_price: body.original_price,
        currency: body.currency || 'CNY',
        stock_qty: body.stock_qty || 0,
        status: body.status || 'draft',
        rating: body.rating,
        review_count: body.review_count || 0,
        sku: body.sku,
        weight_kg: body.weight_kg,
        dimensions: body.dimensions as any,
        brand: body.brand,
        tags: body.tags as any,
        specifications: body.specifications as any,
        cover_asset_id: body.image_ids && body.image_ids.length > 0 ? body.image_ids[0] : (body.cover_asset_id || null),
        gallery_asset_ids: body.image_ids && body.image_ids.length > 1 ? body.image_ids.slice(1) : (body.gallery_asset_ids || null),
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
        category: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (product.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...product,
      galleryAssets,
    };
  });

  fastify.put('/shopping/products/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        category_id: body.category_id,
        title: body.title,
        description: body.description,
        price: body.price,
        original_price: body.original_price,
        currency: body.currency,
        stock_qty: body.stock_qty,
        status: body.status,
        rating: body.rating,
        review_count: body.review_count,
        sku: body.sku,
        weight_kg: body.weight_kg,
        dimensions: body.dimensions as any,
        brand: body.brand,
        tags: body.tags as any,
        specifications: body.specifications as any,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
        category: true,
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (product.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...product,
      galleryAssets,
    };
  });

  fastify.delete('/shopping/products/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.product.delete({ where: { id: params.id } });
    return { message: 'Product deleted' };
  });

  // Shopping - Orders
  fastify.get('/shopping/orders', async () => {
    return prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  });

  // Shopping - Hot Items (TMAPI)
  fastify.get('/shopping/hot-items', async (request: FastifyRequest) => {
    const { category_slug, source } = request.query as { category_slug?: string; source?: string };
    const where: any = {};
    if (source) where.source = source;
    return prisma.externalHotItem.findMany({
      where,
      orderBy: { pinned_rank: 'asc' }, // Lower rank = higher priority
    });
  });

  fastify.post('/shopping/hot-items', async (request: FastifyRequest) => {
    const body = request.body as any;
    return prisma.externalHotItem.create({
      data: {
        source: body.source || 'tmapi_1688',
        external_id: body.external_id,
        category_slug: body.category_slug || '',
        pinned_rank: body.pinned_rank !== undefined ? body.pinned_rank : (body.is_pinned ? 1 : 0), // Support both old and new format
      },
    });
  });

  fastify.put('/shopping/hot-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    return prisma.externalHotItem.update({
      where: { id: params.id },
      data: {
        external_id: body.external_id,
        category_slug: body.category_slug,
        pinned_rank: body.pinned_rank !== undefined ? body.pinned_rank : (body.is_pinned ? 1 : 0), // Support both old and new format
      },
    });
  });

  fastify.delete('/shopping/hot-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.externalHotItem.delete({
      where: { id: params.id },
    });
    return { success: true };
  });

  // Media library with filters
  fastify.get('/media', async (request: FastifyRequest) => {
    const { search, category, tags, page = '1', limit = '24' } = request.query as any;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 24;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { r2_key: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (tags && Array.isArray(tags)) {
      where.tags = { hasSome: tags };
    }

    const [media, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    // Extract title from tags for each media item
    const mediaWithTitle = media.map((item) => {
      const tags = (item.tags as string[]) || [];
      const titleTag = tags.find((t: string) => t.startsWith('title:'));
      const title = titleTag ? titleTag.replace('title:', '') : null;
      const otherTags = tags.filter((t: string) => !t.startsWith('title:'));
      return {
        ...item,
        title,
        tags: otherTags, // Return tags without title prefix
      };
    });

    return {
      media: mediaWithTitle,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  // Server-side media upload (handles thumbnail generation, avoids CORS)
  fastify.post('/media/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    
    try {
      // Check R2 configuration first
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
        return reply.status(500).send({ 
          error: 'R2 not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in .env' 
        });
      }

      console.log('[Upload] Starting upload process...');

      // Parse multipart form data properly
      let fileData: any = null;
      let category = '';
      let tags = '';

      console.log('[Upload] Parsing multipart data...');
      
      // Use request.parts() with proper async iteration and timeout
      try {
        const parts = request.parts();
        console.log('[Upload] Got parts iterator');
        
        // Add timeout to prevent hanging
        const parseTimeout = setTimeout(() => {
          console.error('[Upload] Multipart parsing timeout after 10 seconds');
        }, 10000);
        
        let partsProcessed = 0;
        let fileChunks: Buffer[] = [];
        
        for await (const part of parts) {
          clearTimeout(parseTimeout);
          partsProcessed++;
          console.log('[Upload] Processing part', partsProcessed, ':', part.type, part.fieldname);
          
          if (part.type === 'file') {
            fileData = part;
            console.log('[Upload] File part found:', part.filename);
            
            // CRITICAL: Consume the file stream IMMEDIATELY during iteration
            // This allows the iterator to continue to the next part
            console.log('[Upload] Reading file stream during iteration...');
            fileChunks = [];
            for await (const chunk of part.file) {
              fileChunks.push(chunk);
            }
            console.log('[Upload] File stream consumed, size:', fileChunks.length, 'chunks');
          } else {
            // Handle form fields
            const value = (part as any).value;
            console.log('[Upload] Field value:', part.fieldname, '=', value);
            if (part.fieldname === 'category') {
              category = value || '';
              console.log('[Upload] Category field:', category);
            } else if (part.fieldname === 'tags') {
              tags = value || '';
              console.log('[Upload] Tags field:', tags);
            }
          }
        }
        
        clearTimeout(parseTimeout);
        console.log('[Upload] Finished parsing parts. Total parts:', partsProcessed);
        
        // If we read the file during iteration, use those chunks
        if (fileChunks.length > 0 && fileData) {
          console.log('[Upload] Using pre-read file chunks');
          // Store chunks in fileData for later use
          (fileData as any)._chunks = fileChunks;
        }
      } catch (parseError: any) {
        console.error('[Upload] Error parsing multipart:', parseError);
        return reply.status(400).send({ 
          error: `Failed to parse upload: ${parseError.message}` 
        });
      }

      if (!fileData) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      console.log('[Upload] File received:', fileData.filename, 'MIME:', fileData.mimetype);

      const { validateImageSize, generateThumbnail, getImageDimensions, uploadToR2, getPublicUrl } = await import('../utils/image-processor.js');
      
      // Read file buffer - use pre-read chunks if available, otherwise read stream
      console.log('[Upload] Reading file buffer...');
      let imageBuffer: Buffer;
      
      if ((fileData as any)._chunks) {
        // Use chunks we read during iteration
        console.log('[Upload] Using pre-read chunks');
        imageBuffer = Buffer.concat((fileData as any)._chunks);
      } else {
        // Read from stream (fallback)
        console.log('[Upload] Reading from stream (fallback)');
        const chunks: Buffer[] = [];
        try {
          for await (const chunk of fileData.file) {
            chunks.push(chunk);
          }
        } catch (readError: any) {
          console.error('[Upload] Error reading file stream:', readError);
          return reply.status(500).send({ 
            error: `Failed to read file: ${readError.message}` 
          });
        }
        imageBuffer = Buffer.concat(chunks);
      }

      console.log('[Upload] File read, size:', imageBuffer.length, 'bytes');

      // Validate file size (1MB max)
      validateImageSize(imageBuffer.length);

      // Validate it's an image
      if (!fileData.mimetype.startsWith('image/')) {
        return reply.status(400).send({ error: 'File must be an image' });
      }

      // Get image dimensions
      console.log('[Upload] Getting image dimensions...');
      const { width, height } = await getImageDimensions(imageBuffer);
      console.log('[Upload] Image dimensions:', width, 'x', height);

      // Generate unique keys
      const timestamp = Date.now();
      const sanitizedFilename = fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const originalKey = `uploads/${timestamp}-${sanitizedFilename}`;
      const thumbnailKey = `thumbnails/${timestamp}-${sanitizedFilename}`;

      console.log('[Upload] Generating thumbnail...');
      // Generate thumbnail
      const thumbnailBuffer = await generateThumbnail(imageBuffer);
      console.log('[Upload] Thumbnail generated, size:', thumbnailBuffer.length, 'bytes');

      // Upload both images to R2
      console.log('[Upload] Uploading to R2...');
      console.log('[Upload] Original key:', originalKey);
      console.log('[Upload] Thumbnail key:', thumbnailKey);
      
      try {
        await Promise.all([
          uploadToR2(originalKey, imageBuffer, fileData.mimetype),
          uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
        ]);
        console.log('[Upload] Files uploaded to R2 successfully');
      } catch (r2Error: any) {
        console.error('[Upload] R2 upload error:', r2Error);
        return reply.status(500).send({ 
          error: `Failed to upload to R2: ${r2Error.message}. Please check your R2 credentials and bucket configuration.` 
        });
      }

      // Get public URLs
      const publicUrl = getPublicUrl(originalKey);
      const thumbnailUrl = getPublicUrl(thumbnailKey);
      console.log('[Upload] Public URLs generated:', { publicUrl, thumbnailUrl });

      // Parse tags
      const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

      // Store in database
      console.log('[Upload] Saving to database...');
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          r2_key: originalKey,
          public_url: publicUrl,
          thumbnail_key: thumbnailKey,
          thumbnail_url: thumbnailUrl,
          mime_type: fileData.mimetype,
          size: imageBuffer.length,
          width,
          height,
          tags: tagsArray,
          category: category || null,
          uploaded_by: req.user.id,
        },
      });

      console.log('[Upload] Media asset created:', mediaAsset.id);
      return mediaAsset;
    } catch (error: any) {
      console.error('[Upload] Error:', error);
      console.error('[Upload] Error stack:', error.stack);
      return reply.status(500).send({ 
        error: error.message || 'Failed to upload image',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Legacy presigned URL endpoint (for backward compatibility, but with size validation)
  fastify.post('/media/presigned-url', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { filename: string; mimeType: string; size?: number };
    const req = request as any;

    // Validate file size
    if (body.size && body.size > 1024 * 1024) {
      return reply.status(400).send({ 
        error: `File size exceeds maximum of 1MB. Current size: ${(body.size / 1024).toFixed(2)}KB` 
      });
    }

    try {
      const { generatePresignedPutUrl, getPublicUrl } = await import('../utils/r2.js');
      const key = `uploads/${Date.now()}-${body.filename}`;
      const { uploadUrl, key: finalKey } = await generatePresignedPutUrl(
        key,
        body.mimeType,
        3600 // 1 hour expiry
      );

      const publicUrl = getPublicUrl(finalKey);

      return {
        uploadUrl,
        key: finalKey,
        publicUrl,
      };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to generate presigned URL' });
    }
  });

  // Record media asset after upload (legacy, for presigned URL flow)
  fastify.post('/media/record', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { 
      r2_key: string; 
      public_url: string; 
      mime_type: string; 
      size: number;
      tags?: string[];
      category?: string;
    };
    const req = request as any;

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        r2_key: body.r2_key,
        public_url: body.public_url,
        mime_type: body.mime_type,
        size: body.size,
        tags: body.tags || [],
        category: body.category || null,
        uploaded_by: req.user.id,
      },
    });

    return mediaAsset;
  });

  // Bulk delete media
  fastify.delete('/media/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { ids: string[] };
    const req = request as any;

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return reply.status(400).send({ error: 'No media IDs provided' });
    }

    // Check permission (admin can delete all, others only their own)
    const isAdmin = req.user.roles?.some((r: any) => ['ADMIN', 'OPS'].includes(r.name));

    // Get media assets to delete (to get R2 keys)
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: body.ids },
        ...(isAdmin ? {} : { uploaded_by: req.user.id }), // Only allow deleting own uploads unless admin
      },
      select: {
        id: true,
        r2_key: true,
        thumbnail_key: true,
      },
    });

    if (mediaAssets.length === 0) {
      return reply.status(404).send({ error: 'No media assets found to delete' });
    }

    // Collect all R2 keys to delete
    const r2KeysToDelete: string[] = [];
    for (const asset of mediaAssets) {
      if (asset.r2_key) {
        r2KeysToDelete.push(asset.r2_key);
      }
      if (asset.thumbnail_key) {
        r2KeysToDelete.push(asset.thumbnail_key);
      }
    }

    // Delete files from R2
    if (r2KeysToDelete.length > 0) {
      try {
        const { deleteMultipleFromR2 } = await import('../utils/r2.js');
        console.log(`[Bulk Media Delete] Deleting ${r2KeysToDelete.length} file(s) from R2...`);
        await deleteMultipleFromR2(r2KeysToDelete);
        console.log(`[Bulk Media Delete] Successfully deleted files from R2`);
      } catch (error: any) {
        // Log error but continue with database deletion
        console.error(`[Bulk Media Delete] Failed to delete from R2:`, error.message);
        console.log(`[Bulk Media Delete] Continuing with database deletion despite R2 error`);
      }
    }

    // Clean up database references for each asset (simplified - using same logic as single delete)
    for (const asset of mediaAssets) {
      // Clear cover_asset_id references
      await Promise.all([
        prisma.$executeRawUnsafe(`UPDATE cities SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE hotels SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE restaurants SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE medical_centers SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE tours SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE transport_products SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE products SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE city_places SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE guide_profiles SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
        prisma.$executeRawUnsafe(`UPDATE esim_plans SET cover_asset_id = NULL WHERE cover_asset_id = $1`, asset.id),
      ]);

      // Remove from gallery_asset_ids arrays
      await Promise.all([
        prisma.$executeRawUnsafe(`
          UPDATE cities 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE hotels 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE restaurants 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE medical_centers 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE tours 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE transport_products 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE products 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
        prisma.$executeRawUnsafe(`
          UPDATE city_places 
          SET gallery_asset_ids = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(gallery_asset_ids) elem
            WHERE elem::text != $1
          )
          WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
        `, asset.id),
      ]);
    }

    // Delete from database
    await prisma.mediaAsset.deleteMany({
      where: {
        id: { in: mediaAssets.map((m) => m.id) },
      },
    });

    console.log(`[Bulk Media Delete] Successfully deleted ${mediaAssets.length} media asset(s) and cleaned up all references`);

    return { deleted: mediaAssets.length, message: 'Media deleted from database and R2, all references cleaned up' };
  });

  // Update media metadata
  fastify.put('/media/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { category?: string; tags?: string[]; title?: string };
    const req = request as any;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    // Check permission (own upload or admin)
    const isAdmin = req.user.roles?.some((r: any) => ['ADMIN', 'OPS'].includes(r.name));
    if (mediaAsset.uploaded_by !== req.user.id && !isAdmin) {
      return reply.status(403).send({ error: 'Not authorized to edit this media' });
    }

    const updateData: any = {};
    if (body.category !== undefined) updateData.category = body.category || null;
    
    // Handle tags and title
    if (body.tags !== undefined || body.title !== undefined) {
      const existingTags = (mediaAsset.tags as string[]) || [];
      // Remove existing title tag
      let filteredTags = existingTags.filter((t: string) => !t.startsWith('title:'));
      
      // Add new title if provided
      if (body.title !== undefined && body.title) {
        filteredTags.push(`title:${body.title}`);
      }
      
      // Merge with new tags if provided
      if (body.tags !== undefined) {
        // Combine existing non-title tags with new tags, removing duplicates
        const newTags = Array.isArray(body.tags) ? body.tags : [];
        const combined = [...filteredTags, ...newTags];
        updateData.tags = [...new Set(combined)]; // Remove duplicates
      } else {
        updateData.tags = filteredTags;
      }
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: updateData,
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updated;
  });

  // Get single media by ID
  fastify.get('/media/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    // Extract title from tags
    const tags = (mediaAsset.tags as string[]) || [];
    const titleTag = tags.find((t: string) => t.startsWith('title:'));
    const title = titleTag ? titleTag.replace('title:', '') : null;
    const otherTags = tags.filter((t: string) => !t.startsWith('title:'));

    return {
      ...mediaAsset,
      title,
      tags: otherTags,
    };
  });

  // Delete single media
  fastify.delete('/media/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ error: 'Media not found' });
    }

    // Check permission (own upload or admin)
    const isAdmin = req.user.roles?.some((r: any) => ['ADMIN', 'OPS'].includes(r.name));
    if (mediaAsset.uploaded_by !== req.user.id && !isAdmin) {
      return reply.status(403).send({ error: 'Not authorized to delete this media' });
    }

    // Clean up all references to this media asset before deleting
    console.log(`[Media Delete] Cleaning up references for media asset ${id}`);

    // 1. Clear cover_asset_id references
    await Promise.all([
      prisma.$executeRaw`UPDATE cities SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE hotels SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE restaurants SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE medical_centers SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE tours SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE transport_products SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE products SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRaw`UPDATE city_places SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
      prisma.$executeRawUnsafe(`UPDATE guide_profiles SET cover_asset_id = NULL WHERE cover_asset_id = $1`, id),
      prisma.$executeRaw`UPDATE esim_plans SET cover_asset_id = NULL WHERE cover_asset_id = ${id}`,
    ]);

    // 2. Remove from gallery_asset_ids arrays using raw SQL
    // This efficiently removes the deleted asset ID from all JSON arrays
    await Promise.all([
      // Cities
      prisma.$executeRawUnsafe(`
        UPDATE cities 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Hotels
      prisma.$executeRawUnsafe(`
        UPDATE hotels 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Restaurants
      prisma.$executeRawUnsafe(`
        UPDATE restaurants 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Medical Centers
      prisma.$executeRawUnsafe(`
        UPDATE medical_centers 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Tours
      prisma.$executeRawUnsafe(`
        UPDATE tours 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Transport Products
      prisma.$executeRawUnsafe(`
        UPDATE transport_products 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // Products
      prisma.$executeRawUnsafe(`
        UPDATE products 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
      // City Places
      prisma.$executeRawUnsafe(`
        UPDATE city_places 
        SET gallery_asset_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements_text(gallery_asset_ids) elem
          WHERE elem::text != $1
        )
        WHERE gallery_asset_ids::text LIKE '%' || $1 || '%'
      `, id),
    ]);

    // 3. Delete files from Cloudflare R2 (both main image and thumbnail)
    try {
      const { deleteMultipleFromR2 } = await import('../utils/r2.js');
      const filesToDelete: string[] = [];
      
      if (mediaAsset.r2_key) {
        filesToDelete.push(mediaAsset.r2_key);
      }
      if (mediaAsset.thumbnail_key) {
        filesToDelete.push(mediaAsset.thumbnail_key);
      }

      if (filesToDelete.length > 0) {
        console.log(`[Media Delete] Deleting ${filesToDelete.length} file(s) from R2: ${filesToDelete.join(', ')}`);
        await deleteMultipleFromR2(filesToDelete);
        console.log(`[Media Delete] Successfully deleted files from R2`);
      } else {
        console.log(`[Media Delete] No R2 files to delete (r2_key and thumbnail_key are both null)`);
      }
    } catch (error: any) {
      // Log error but continue with database deletion
      // This ensures database consistency even if R2 deletion fails
      console.error(`[Media Delete] Failed to delete from R2:`, error.message);
      console.log(`[Media Delete] Continuing with database deletion despite R2 error`);
    }

    // 4. Now safe to delete the media asset from database
    await prisma.mediaAsset.delete({
      where: { id },
    });

    console.log(`[Media Delete] Successfully deleted media asset ${id} and cleaned up all references`);

    return { success: true, message: 'Media deleted from database and R2, all references cleaned up' };
  });

  // Blog
  fastify.get('/blog', async () => {
    return prisma.blogPost.findMany({
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/blog', async (request: FastifyRequest) => {
    const body = request.body as any;
    const req = request as any;

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || null,
        content_md: body.content_md,
        cover_asset_id: body.cover_asset_id || null,
        status: body.status || 'draft',
        published_at: body.status === 'published' ? new Date() : null,
        created_by: req.user.id,
      },
    });

    return post;
  });

  fastify.patch('/blog/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
        ...(body.content_md ? { content_md: body.content_md } : {}),
        ...(body.cover_asset_id !== undefined ? { cover_asset_id: body.cover_asset_id } : {}),
        ...(body.status ? { status: body.status, published_at: body.status === 'published' ? new Date() : null } : {}),
      },
    });

    return post;
  });

  // Users
  fastify.get('/users', async () => {
    return prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  });

  // Get all roles (for user role assignment)
  fastify.get('/roles', async () => {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  });

  // Update user roles
  fastify.put('/users/:id/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role_ids: string[] };

    if (!body.role_ids || !Array.isArray(body.role_ids)) {
      reply.status(400).send({ error: 'role_ids must be an array' });
      return;
    }

    // Verify user exists and get current roles
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    // Check if user currently has SERVICE_PROVIDER role
    const hadServiceProviderRole = user.roles.some((ur) => ur.role.name === 'SERVICE_PROVIDER');

    // Get SERVICE_PROVIDER role ID to check if it's being removed
    const serviceProviderRole = await prisma.role.findUnique({
      where: { name: 'SERVICE_PROVIDER' },
    });

    const hasServiceProviderRoleInNew = serviceProviderRole && body.role_ids.includes(serviceProviderRole.id);

    // Delete all existing user roles
    await prisma.userRole.deleteMany({
      where: { user_id: id },
    });

    // Create new user roles
    if (body.role_ids.length > 0) {
      await prisma.userRole.createMany({
        data: body.role_ids.map((role_id) => ({
          user_id: id,
          role_id,
        })),
      });
    }

    // If SERVICE_PROVIDER role was removed, delete the service provider profile
    if (hadServiceProviderRole && !hasServiceProviderRoleInNew) {
      await prisma.serviceProviderProfile.deleteMany({
        where: { user_id: id },
      });
    }

    // Fetch updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return updatedUser;
  });

  // Audit logs
  fastify.get('/audit', async (request: FastifyRequest) => {
    const { entity_type, entity_id, limit = '50' } = request.query as {
      entity_type?: string;
      entity_id?: string;
      limit?: string;
    };

    const logs = await prisma.activityLog.findMany({
      where: {
        ...(entity_type ? { entity_type } : {}),
        ...(entity_id ? { entity_id } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
    });

    return logs;
  });

  // Homepage Management
  fastify.get('/homepage/blocks', async () => {
    return prisma.homepageBlock.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  });

  fastify.post('/homepage/blocks', async (request: FastifyRequest) => {
    const body = request.body as any;
    return prisma.homepageBlock.create({
      data: body,
    });
  });

  fastify.patch('/homepage/blocks/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return prisma.homepageBlock.update({
      where: { id },
      data: body,
    });
  });

  fastify.delete('/homepage/blocks/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    return prisma.homepageBlock.delete({
      where: { id },
    });
  });

  // Featured Items CRUD
  fastify.get('/featured-items', async (request: FastifyRequest) => {
    const { entity_type, is_active } = request.query as any;
    const where: any = {};
    if (entity_type) where.entity_type = entity_type;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const items = await prisma.featuredItem.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });

    // Fetch actual entity data for each featured item
    const itemsWithData = await Promise.all(
      items.map(async (item) => {
        let entityData: any = null;
        try {
          switch (item.entity_type) {
            case 'hotel':
              entityData = await prisma.hotel.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              break;
            case 'restaurant':
              entityData = await prisma.restaurant.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              break;
            case 'food_item':
              entityData = await prisma.foodItem.findUnique({
                where: { id: item.entity_id },
                include: { restaurant: true, category: true, coverAsset: true },
              });
              break;
            case 'cityplace':
              entityData = await prisma.cityPlace.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              break;
            case 'tour':
              entityData = await prisma.tour.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              break;
            case 'esim_plan':
              entityData = await prisma.esimPlan.findUnique({
                where: { id: item.entity_id },
                include: { coverAsset: true },
              });
              break;
            case 'product':
              entityData = await prisma.product.findUnique({
                where: { id: item.entity_id },
                include: { category: true, coverAsset: true },
              });
              break;
          }
        } catch (error) {
          console.error(`Failed to load ${item.entity_type} ${item.entity_id}:`, error);
        }
        return {
          ...item,
          entity: entityData,
        };
      })
    );

    return itemsWithData;
  });

  fastify.post('/featured-items', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Limits per entity type
    const typeLimits: Record<string, number> = {
      hotel: 8,
      restaurant: 4,
      food_item: 8,
      esim_plan: 4,
      cityplace: 8,
      tour: 4,
      product: 8,
      transport: 4,
    };
    
    const limit = typeLimits[body.entity_type] || 8;
    
    // Check if we already have the max active featured items for this type
    const activeCount = await prisma.featuredItem.count({
      where: { 
        entity_type: body.entity_type,
        is_active: true,
      },
    });
    
    if (activeCount >= limit && body.is_active !== false) {
      const typeName = body.entity_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return { error: `Maximum ${limit} featured ${typeName} items allowed. Please deactivate an existing item first.` };
    }

    // Check for duplicate
    const existing = await prisma.featuredItem.findUnique({
      where: {
        entity_type_entity_id: {
          entity_type: body.entity_type,
          entity_id: body.entity_id,
        },
      },
    });

    if (existing) {
      return { error: 'This item is already featured' };
    }

    return prisma.featuredItem.create({
      data: {
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        sort_order: body.sort_order || 0,
        is_active: body.is_active !== undefined ? body.is_active : true,
        title_override: body.title_override,
        subtitle_override: body.subtitle_override,
      },
    });
  });

  fastify.put('/featured-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;

    // Get the existing item to check its type
    const existingItem = await prisma.featuredItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return { error: 'Featured item not found' };
    }

    // Limits per entity type
    const typeLimits: Record<string, number> = {
      hotel: 8,
      restaurant: 4,
      food_item: 8,
      esim_plan: 4,
      cityplace: 8,
      tour: 4,
      product: 8,
      transport: 4,
    };
    
    const limit = typeLimits[existingItem.entity_type] || 8;

    // If activating, check count for this type
    if (body.is_active === true) {
      const activeCount = await prisma.featuredItem.count({
        where: { 
          entity_type: existingItem.entity_type,
          is_active: true, 
          id: { not: params.id } 
        },
      });
      if (activeCount >= limit) {
        const typeName = existingItem.entity_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return { error: `Maximum ${limit} featured ${typeName} items allowed. Please deactivate an existing item first.` };
      }
    }

    return prisma.featuredItem.update({
      where: { id: params.id },
      data: {
        sort_order: body.sort_order,
        is_active: body.is_active,
        title_override: body.title_override,
        subtitle_override: body.subtitle_override,
      },
    });
  });

  fastify.delete('/featured-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.featuredItem.delete({ where: { id: params.id } });
    return { message: 'Featured item deleted' };
  });

  // Gallery CRUD
  fastify.get('/gallery', async (request: FastifyRequest) => {
    const { city_id, page = '1', limit = '20', search } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where: any = {};
    if (city_id) where.city_id = city_id;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [images, total] = await Promise.all([
      prisma.galleryImage.findMany({
        where,
        include: { asset: true, city: true },
        orderBy: { sort_order: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.galleryImage.count({ where }),
    ]);

    return { images, total, page: parseInt(page), limit: parseInt(limit) };
  });

  fastify.post('/gallery', async (request: FastifyRequest) => {
    const body = request.body as any;
    return prisma.galleryImage.create({
      data: body,
      include: { asset: true, city: true },
    });
  });

  fastify.patch('/gallery/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return prisma.galleryImage.update({
      where: { id },
      data: body,
      include: { asset: true, city: true },
    });
  });

  fastify.delete('/gallery/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    return prisma.galleryImage.delete({
      where: { id },
    });
  });

  // eSIM Plans CRUD
  fastify.get('/esim/plans', async (request: FastifyRequest) => {
    const { search, is_active, country, page = '1', limit = '50', sort = 'created_at' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { region_text: { contains: search, mode: 'insensitive' } },
        { data_text: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (country) where.country = country;

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'price') orderBy.price = 'asc';
    else orderBy.created_at = 'desc';

    const [plans, total] = await Promise.all([
      prisma.esimPlan.findMany({
        where,
        include: {
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.esimPlan.count({ where }),
    ]);

    // Load gallery assets for each plan
    const plansWithGallery = await Promise.all(
      plans.map(async (plan) => {
        const galleryIds = (plan.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...plan,
          galleryAssets,
        };
      })
    );

    return {
      data: plansWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.get('/esim/plans/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const plan = await prisma.esimPlan.findUnique({
      where: { id: params.id },
      include: {
        coverAsset: true,
      },
    });

    if (!plan) {
      return { error: 'eSIM plan not found' };
    }

    // Load gallery assets
    const galleryIds = (plan.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...plan,
      galleryAssets,
    };
  });

  fastify.post('/esim/plans', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : body.cover_asset_id || null;
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || []);

    const createdPlan = await prisma.esimPlan.create({
      data: {
        name: body.name,
        package_code: body.package_code,
        provider: body.provider,
        country: body.country || 'China',
        region_text: body.region_text,
        package_type: body.package_type || 'single_country',
        data_text: body.data_text,
        data_amount_gb: body.data_amount_gb,
        data_period: body.data_period,
        validity_days: body.validity_days,
        price: body.price,
        currency: body.currency || 'USD',
        is_active: body.is_active !== undefined ? body.is_active : true,
        data_speed: body.data_speed,
        supported_operators: body.supported_operators as any,
        sms_enabled: body.sms_enabled || false,
        number_available: body.number_available || false,
        description: body.description,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds.length > 0 ? galleryAssetIds : null,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (createdPlan.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...createdPlan,
      galleryAssets,
    };
  });

  fastify.put('/esim/plans/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    // Check if package_code is being changed and if it conflicts with another plan
    if (body.package_code !== undefined && body.package_code !== null) {
      const existingPlan = await prisma.esimPlan.findFirst({
        where: {
          package_code: body.package_code,
          id: { not: params.id }, // Exclude the current plan
        },
      });
      
      if (existingPlan) {
        reply.status(400).send({ 
          error: `Package code "${body.package_code}" already exists in another eSIM plan (ID: ${existingPlan.id})` 
        });
        return;
      }
    }
    
    const updatedPlan = await prisma.esimPlan.update({
      where: { id: params.id },
      data: {
        name: body.name,
        ...(body.package_code !== undefined ? { package_code: body.package_code } : {}),
        provider: body.provider,
        country: body.country,
        region_text: body.region_text,
        package_type: body.package_type,
        data_text: body.data_text,
        data_amount_gb: body.data_amount_gb,
        data_period: body.data_period,
        validity_days: body.validity_days,
        price: body.price,
        currency: body.currency,
        is_active: body.is_active,
        data_speed: body.data_speed,
        supported_operators: body.supported_operators as any,
        sms_enabled: body.sms_enabled,
        number_available: body.number_available,
        description: body.description,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (updatedPlan.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...updatedPlan,
      galleryAssets,
    };
  });

  fastify.delete('/esim/plans/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    return prisma.esimPlan.delete({
      where: { id: params.id },
    });
  });

  // City Places CRUD
  fastify.get('/catalog/cityplaces', async (request: FastifyRequest) => {
    const { search, city_id, is_active, page = '1', limit = '50', sort = 'created_at' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'rating') orderBy.star_rating = 'desc';
    else orderBy.created_at = 'desc';

    const [places, total] = await Promise.all([
      prisma.cityPlace.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
          tourLinks: {
            include: { tour: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.cityPlace.count({ where }),
    ]);

    // Load gallery assets for each place
    const placesWithGallery = await Promise.all(
      places.map(async (place) => {
        const galleryIds = (place.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...place,
          galleryAssets,
        };
      })
    );

    return {
      data: placesWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/cityplaces', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : body.cover_asset_id || null;
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || []);

    const place = await prisma.cityPlace.create({
      data: {
        city_id: body.city_id,
        name: body.name,
        slug: body.slug,
        short_description: body.short_description,
        description: body.description,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        cost_range: body.cost_range,
        opening_hours: body.opening_hours as any,
        customer_support_phone: body.customer_support_phone,
        is_family_friendly: body.is_family_friendly || false,
        is_pet_friendly: body.is_pet_friendly || false,
        is_active: body.is_active !== undefined ? body.is_active : true,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds.length > 0 ? galleryAssetIds : null,
        tourLinks: body.tour_ids ? {
          create: body.tour_ids.map((tourId: string, index: number) => ({
            tour_id: tourId,
            sort_order: index,
            is_highlight: index === 0,
          })),
        } : undefined,
      },
      include: {
        city: true,
        coverAsset: true,
        tourLinks: {
          include: { tour: true },
        },
      },
    });

    // Load gallery assets
    const galleryIds = (place.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...place,
      galleryAssets,
    };
  });

  fastify.put('/catalog/cityplaces/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);
    
    if (body.tour_ids) {
      await prisma.tourCityPlace.deleteMany({
        where: { city_place_id: params.id },
      });
      await prisma.tourCityPlace.createMany({
        data: body.tour_ids.map((tourId: string, index: number) => ({
          city_place_id: params.id,
          tour_id: tourId,
          sort_order: index,
          is_highlight: index === 0,
        })),
      });
    }
    
    const place = await prisma.cityPlace.update({
      where: { id: params.id },
      data: {
        city_id: body.city_id,
        name: body.name,
        slug: body.slug,
        short_description: body.short_description,
        description: body.description,
        address: body.address,
        geo_lat: body.geo_lat,
        geo_lng: body.geo_lng,
        cost_range: body.cost_range,
        opening_hours: body.opening_hours as any,
        customer_support_phone: body.customer_support_phone,
        is_family_friendly: body.is_family_friendly,
        is_pet_friendly: body.is_pet_friendly,
        is_active: body.is_active,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
      },
      include: {
        city: true,
        coverAsset: true,
        tourLinks: {
          include: { tour: true },
        },
      },
    });

    // Load gallery assets
    const galleryIds = (place.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...place,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/cityplaces/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.cityPlace.delete({ where: { id: params.id } });
    return { message: 'City place deleted' };
  });

  // Food Categories CRUD
  fastify.get('/catalog/food-categories', async (request: FastifyRequest) => {
    const { search, is_active, page = '1', limit = '50', sort = 'sort_order' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { name_cn: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'name_cn') orderBy.name_cn = 'asc';
    else orderBy.sort_order = 'asc';

    const [categories, total] = await Promise.all([
      prisma.foodCategory.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.foodCategory.count({ where }),
    ]);

    return {
      data: categories,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/food-categories', async (request: FastifyRequest) => {
    const body = request.body as any;
    return prisma.foodCategory.create({
      data: {
        name: body.name,
        name_cn: body.name_cn,
        description: body.description,
        icon: body.icon,
        sort_order: body.sort_order || 0,
        is_active: body.is_active !== undefined ? body.is_active : true,
      },
    });
  });

  fastify.put('/catalog/food-categories/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    return prisma.foodCategory.update({
      where: { id: params.id },
      data: {
        name: body.name,
        name_cn: body.name_cn,
        description: body.description,
        icon: body.icon,
        sort_order: body.sort_order,
        is_active: body.is_active,
      },
    });
  });

  fastify.delete('/catalog/food-categories/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.foodCategory.delete({ where: { id: params.id } });
    return { message: 'Food category deleted' };
  });

  // Food Items CRUD
  fastify.get('/catalog/food-items', async (request: FastifyRequest) => {
    const { search, restaurant_id, category_id, is_available, is_halal, page = '1', limit = '50', sort = 'created_at' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { name_cn: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (restaurant_id) where.restaurant_id = restaurant_id;
    if (category_id) where.category_id = category_id;
    if (is_available !== undefined) where.is_available = is_available === 'true';
    if (is_halal !== undefined) where.is_halal = is_halal === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.name = 'asc';
    else if (sort === 'price') orderBy.price = 'asc';
    else orderBy.created_at = 'desc';

    const [items, total] = await Promise.all([
      prisma.foodItem.findMany({
        where,
        include: {
          restaurant: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, name_cn: true },
          },
          coverAsset: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.foodItem.count({ where }),
    ]);

    // Load gallery assets for each item
    const itemsWithGallery = await Promise.all(
      items.map(async (item) => {
        const galleryIds = (item.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...item,
          galleryAssets,
        };
      })
    );

    return {
      data: itemsWithGallery,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/food-items', async (request: FastifyRequest) => {
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : body.cover_asset_id || null;
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || []);

    return prisma.foodItem.create({
      data: {
        restaurant_id: body.restaurant_id,
        category_id: body.category_id || null,
        name: body.name,
        name_cn: body.name_cn,
        description: body.description,
        price: body.price,
        currency: body.currency || 'CNY',
        is_available: body.is_available !== undefined ? body.is_available : true,
        is_vegetarian: body.is_vegetarian || false,
        is_vegan: body.is_vegan || false,
        is_halal: body.is_halal !== undefined ? body.is_halal : true,
        spicy_level: body.spicy_level || 0,
        allergens: body.allergens as any,
        ingredients: body.ingredients as any,
        nutrition_info: body.nutrition_info as any,
        preparation_time: body.preparation_time,
        serving_size: body.serving_size,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds.length > 0 ? galleryAssetIds : null,
        sort_order: body.sort_order || 0,
      },
      include: {
        restaurant: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, name_cn: true },
        },
        coverAsset: true,
      },
    });
  });

  fastify.put('/catalog/food-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;
    
    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id !== undefined ? body.cover_asset_id : null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids !== undefined ? body.gallery_asset_ids : null);

    const item = await prisma.foodItem.update({
      where: { id: params.id },
      data: {
        restaurant_id: body.restaurant_id,
        category_id: body.category_id || null,
        name: body.name,
        name_cn: body.name_cn,
        description: body.description,
        price: body.price,
        currency: body.currency,
        is_available: body.is_available,
        is_vegetarian: body.is_vegetarian,
        is_vegan: body.is_vegan,
        is_halal: body.is_halal,
        spicy_level: body.spicy_level,
        allergens: body.allergens as any,
        ingredients: body.ingredients as any,
        nutrition_info: body.nutrition_info as any,
        preparation_time: body.preparation_time,
        serving_size: body.serving_size,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
        sort_order: body.sort_order,
      },
      include: {
        restaurant: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, name_cn: true },
        },
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (item.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...item,
      galleryAssets,
    };
  });

  fastify.delete('/catalog/food-items/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.foodItem.delete({ where: { id: params.id } });
    return { message: 'Food item deleted' };
  });

  // Guide Profiles CRUD
  fastify.get('/catalog/guides', async (request: FastifyRequest) => {
    const { search, city_id, verified, page = '1', limit = '50', sort = 'created_at' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { display_name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city_id) where.city_id = city_id;
    if (verified !== undefined) where.verified = verified === 'true';

    const orderBy: any = {};
    if (sort === 'name') orderBy.display_name = 'asc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else orderBy.created_at = 'desc';

    const [guides, total] = await Promise.all([
      prisma.guideProfile.findMany({
        where,
        include: {
          city: true,
          coverAsset: true,
          user: {
            select: { id: true, email: true, phone: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.guideProfile.count({ where }),
    ]);

    return {
      data: guides,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.post('/catalog/guides', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    // Validate required fields (user_id is now optional - admin can create profiles without users)
    if (!body.city_id) {
      reply.status(400).send({ error: 'city_id is required' });
      return;
    }

    if (!body.display_name) {
      reply.status(400).send({ error: 'display_name is required' });
      return;
    }

    // If user_id is provided, verify it exists and check for existing guide
    if (body.user_id) {
      // Check if guide already exists for this user_id
      const existingGuide = await prisma.guideProfile.findUnique({
        where: { user_id: body.user_id },
      });

      if (existingGuide) {
        reply.status(409).send({ error: 'Guide profile already exists for this user. Use PUT to update instead.' });
        return;
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: body.user_id },
      });

      if (!user) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }
    }

    // Verify city exists
    const city = await prisma.city.findUnique({
      where: { id: body.city_id },
    });

    if (!city) {
      reply.status(404).send({ error: 'City not found' });
      return;
    }

    try {
      const guide = await prisma.guideProfile.create({
        data: {
          user_id: body.user_id || null, // Optional - can be null for unclaimed profiles
          city_id: body.city_id,
          display_name: body.display_name,
          bio: body.bio || null,
          languages: body.languages || [],
          hourly_rate: body.hourly_rate || null,
          daily_rate: body.daily_rate || null,
          verified: body.verified !== undefined ? body.verified : false,
          cover_asset_id: body.cover_asset_id || null,
        },
        include: {
          city: true,
          coverAsset: true,
          user: {
            select: { id: true, email: true, phone: true },
          },
        },
      });

      return guide;
    } catch (error: any) {
      fastify.log.error({ error, body }, '[Admin] Failed to create guide');
      reply.status(500).send({ error: error.message || 'Failed to create guide profile' });
      return;
    }
  });

  fastify.get('/catalog/guides/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const guide = await prisma.guideProfile.findUnique({
      where: { id: params.id },
      include: {
        city: true,
        coverAsset: true,
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    if (!guide) {
      return { error: 'Guide not found' };
    }

    return guide;
  });

  fastify.put('/catalog/guides/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as any;

    // If user_id is being updated, verify it exists and check for conflicts
    if (body.user_id !== undefined) {
      if (body.user_id) {
        // Check if another guide already has this user_id
        const existingGuide = await prisma.guideProfile.findUnique({
          where: { user_id: body.user_id },
        });

        if (existingGuide && existingGuide.id !== params.id) {
          reply.status(409).send({ error: 'Another guide profile already exists for this user' });
          return;
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: body.user_id },
        });

        if (!user) {
          reply.status(404).send({ error: 'User not found' });
          return;
        }
      }
    }

    const guide = await prisma.guideProfile.update({
      where: { id: params.id },
      data: {
        user_id: body.user_id !== undefined ? (body.user_id || null) : undefined, // Allow setting to null
        city_id: body.city_id,
        display_name: body.display_name,
        bio: body.bio || null,
        languages: body.languages || [],
        hourly_rate: body.hourly_rate || null,
        daily_rate: body.daily_rate || null,
        verified: body.verified !== undefined ? body.verified : false,
        cover_asset_id: body.cover_asset_id || null,
      },
      include: {
        city: true,
        coverAsset: true,
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    return guide;
  });

  fastify.delete('/catalog/guides/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    await prisma.guideProfile.delete({ where: { id: params.id } });
    return { message: 'Guide profile deleted' };
  });

  // Guide Requests Management
  fastify.get('/guide/requests', async (request: FastifyRequest) => {
    const { status, city_id, page = '1', limit = '50' } = request.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (city_id) {
      where.request = { city_id };
    }

    const [requests, total] = await Promise.all([
      prisma.guideRequest.findMany({
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
            include: {
              guide: {
                include: {
                  city: true,
                  coverAsset: true,
                },
              },
            },
          },
        },
        orderBy: { request: { created_at: 'desc' } },
        skip,
        take: limitNum,
      }),
      prisma.guideRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  });

  fastify.get('/guide/requests/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const guideRequest = await prisma.guideRequest.findUnique({
      where: { request_id: params.id },
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
          include: {
            guide: {
              include: {
                city: true,
                coverAsset: true,
                user: {
                  select: { id: true, email: true, phone: true },
                },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!guideRequest) {
      return { error: 'Guide request not found' };
    }

    return guideRequest;
  });

  fastify.put('/guide/requests/:id/status', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;

    const guideRequest = await prisma.guideRequest.update({
      where: { request_id: params.id },
      data: { status: body.status },
      include: {
        request: true,
      },
    });

    return guideRequest;
  });

  // Service-Based Offers CRUD
  fastify.get('/service-offers', async (request: FastifyRequest) => {
    const { service_type, is_active } = request.query as any;
    const where: any = {};
    if (service_type) where.service_type = service_type;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offers = await prisma.serviceBasedOffer.findMany({
      where,
      include: {
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Load gallery assets for each offer
    const offersWithGallery = await Promise.all(
      offers.map(async (offer) => {
        const galleryIds = (offer.gallery_asset_ids as string[]) || [];
        const galleryAssets = galleryIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: galleryIds } },
            })
          : [];
        return {
          ...offer,
          galleryAssets,
        };
      })
    );

    return offersWithGallery;
  });

  fastify.get('/service-offers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const offer = await prisma.serviceBasedOffer.findUnique({
      where: { id },
      include: {
        coverAsset: true,
      },
    });

    if (!offer) {
      reply.status(404).send({ error: 'Service offer not found' });
      return;
    }

    // Load gallery assets
    const galleryIds = (offer.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...offer,
      galleryAssets,
    };
  });

  fastify.post('/service-offers', async (request: FastifyRequest) => {
    const body = request.body as any;
    const req = request as any;

    // Check if offer already exists for this service type
    const existing = await prisma.serviceBasedOffer.findUnique({
      where: { service_type: body.service_type },
    });

    if (existing) {
      return { error: `An offer already exists for service type: ${body.service_type}. Please update the existing offer instead.` };
    }

    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids || [];
    const coverAssetId = imageIds.length > 0 ? imageIds[0] : (body.cover_asset_id || null);
    const galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : (body.gallery_asset_ids || null);

    const offer = await prisma.serviceBasedOffer.create({
      data: {
        service_type: body.service_type,
        offer_type: body.offer_type, // percentage or fixed_amount
        value: body.value,
        currency: body.currency || 'CNY',
        title: body.title,
        description: body.description,
        terms_and_conditions: body.terms_and_conditions,
        cover_asset_id: coverAssetId,
        gallery_asset_ids: galleryAssetIds,
        is_active: body.is_active !== undefined ? body.is_active : true,
        valid_from: body.valid_from ? new Date(body.valid_from) : null,
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
        min_purchase_amount: body.min_purchase_amount || null,
        max_discount_amount: body.max_discount_amount || null,
        usage_limit: body.usage_limit || null,
        usage_count: 0,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (offer.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...offer,
      galleryAssets,
    };
  });

  fastify.put('/service-offers/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;

    // Check if changing service_type would conflict with another offer
    if (body.service_type) {
      const existing = await prisma.serviceBasedOffer.findUnique({
        where: { service_type: body.service_type },
      });
      if (existing && existing.id !== params.id) {
        return { error: `An offer already exists for service type: ${body.service_type}` };
      }
    }

    // Process image_ids: first is cover, rest are gallery
    const imageIds = body.image_ids;
    let coverAssetId = body.cover_asset_id;
    let galleryAssetIds = body.gallery_asset_ids;

    if (imageIds && Array.isArray(imageIds)) {
      coverAssetId = imageIds.length > 0 ? imageIds[0] : null;
      galleryAssetIds = imageIds.length > 1 ? imageIds.slice(1) : null;
    }

    const offer = await prisma.serviceBasedOffer.update({
      where: { id: params.id },
      data: {
        service_type: body.service_type,
        offer_type: body.offer_type,
        value: body.value,
        currency: body.currency,
        title: body.title,
        description: body.description,
        terms_and_conditions: body.terms_and_conditions,
        cover_asset_id: coverAssetId !== undefined ? coverAssetId : undefined,
        gallery_asset_ids: galleryAssetIds !== undefined ? galleryAssetIds : undefined,
        is_active: body.is_active,
        valid_from: body.valid_from ? new Date(body.valid_from) : body.valid_from === null ? null : undefined,
        valid_until: body.valid_until ? new Date(body.valid_until) : body.valid_until === null ? null : undefined,
        min_purchase_amount: body.min_purchase_amount !== undefined ? body.min_purchase_amount : undefined,
        max_discount_amount: body.max_discount_amount !== undefined ? body.max_discount_amount : undefined,
        usage_limit: body.usage_limit !== undefined ? body.usage_limit : undefined,
        usage_count: body.usage_count !== undefined ? body.usage_count : undefined,
      },
      include: {
        coverAsset: true,
      },
    });

    // Load gallery assets
    const galleryIds = (offer.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...offer,
      galleryAssets,
    };
  });

  fastify.delete('/service-offers/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    
    await prisma.serviceBasedOffer.delete({
      where: { id: params.id },
    });

    return { success: true };
  });

  // Homepage Banners CRUD
  fastify.get('/homepage-banners', async (request: FastifyRequest) => {
    const banners = await prisma.homepageBanner.findMany({
      include: {
        coverAsset: true,
      },
      orderBy: {
        sort_order: 'asc',
      },
    });

    return banners;
  });

  fastify.get('/homepage-banners/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const banner = await prisma.homepageBanner.findUnique({
      where: { id: params.id },
      include: {
        coverAsset: true,
      },
    });

    if (!banner) {
      return { error: 'Banner not found' };
    }

    return banner;
  });

  fastify.post('/homepage-banners', async (request: FastifyRequest) => {
    const body = request.body as any;

    const banner = await prisma.homepageBanner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle,
        cover_asset_id: body.cover_asset_id || body.image_url || null, // Support both old and new format
        link: body.link || body.link_url,
        cta_text: body.cta_text || body.link_text || body.linkText || 'Learn More',
        is_active: body.is_active !== undefined ? body.is_active : true,
        sort_order: body.sort_order || 0,
      },
      include: {
        coverAsset: true,
      },
    });

    return banner;
  });

  fastify.put('/homepage-banners/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    const body = request.body as any;

    const banner = await prisma.homepageBanner.update({
      where: { id: params.id },
      data: {
        title: body.title,
        subtitle: body.subtitle,
        cover_asset_id: body.cover_asset_id !== undefined ? body.cover_asset_id : (body.image_url || null),
        link: body.link !== undefined ? body.link : body.link_url,
        cta_text: body.cta_text !== undefined ? body.cta_text : body.link_text,
        is_active: body.is_active,
        sort_order: body.sort_order,
      },
      include: {
        coverAsset: true,
      },
    });

    return banner;
  });

  fastify.delete('/homepage-banners/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };

    await prisma.homepageBanner.delete({
      where: { id: params.id },
    });

    return { message: 'Banner deleted successfully' };
  });

  // Service Provider Profiles CRUD
  fastify.get('/service-providers', async () => {
    const providers = await prisma.serviceProviderProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
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

    return providers;
  });

  fastify.get('/service-providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.serviceProviderProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!provider) {
      reply.status(404).send({ error: 'Service provider not found' });
      return;
    }

    return provider;
  });

  fastify.post('/service-providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      user_id: string;
      categories?: string[];
      city_id?: string;
      is_active?: boolean;
      is_default?: boolean;
    };

    if (!body.user_id) {
      reply.status(400).send({ error: 'user_id is required' });
      return;
    }

    // Verify user exists and has SERVICE_PROVIDER role
    const user = await prisma.user.findUnique({
      where: { id: body.user_id },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    const hasServiceProviderRole = user.roles.some((ur) => ur.role.name === 'SERVICE_PROVIDER');
    if (!hasServiceProviderRole) {
      reply.status(400).send({ error: 'User does not have SERVICE_PROVIDER role' });
      return;
    }

    // Check if profile already exists
    const existing = await prisma.serviceProviderProfile.findUnique({
      where: { user_id: body.user_id },
    });

    if (existing) {
      reply.status(400).send({ error: 'Service provider profile already exists for this user' });
      return;
    }

    const provider = await prisma.serviceProviderProfile.create({
      data: {
        user_id: body.user_id,
        categories: body.categories || [],
        city_id: body.city_id || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_default: body.is_default !== undefined ? body.is_default : false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return provider;
  });

  fastify.put('/service-providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      categories?: string[];
      city_id?: string;
      is_active?: boolean;
      is_default?: boolean;
    };

    const provider = await prisma.serviceProviderProfile.findUnique({
      where: { id },
    });

    if (!provider) {
      reply.status(404).send({ error: 'Service provider not found' });
      return;
    }

    const updateData: any = {};
    if (body.categories !== undefined) updateData.categories = body.categories;
    if (body.city_id !== undefined) updateData.city_id = body.city_id || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const updated = await prisma.serviceProviderProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updated;
  });

  fastify.delete('/service-providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.serviceProviderProfile.findUnique({
      where: { id },
    });

    if (!provider) {
      reply.status(404).send({ error: 'Service provider not found' });
      return;
    }

    await prisma.serviceProviderProfile.delete({
      where: { id },
    });

    return { success: true };
  });

  // Get eligible users for service provider assignment (with search and exclude existing)
  fastify.get('/users/eligible-providers', async (request: FastifyRequest) => {
    const query = request.query as { query?: string; excludeExistingProviders?: string };
    const searchQuery = query.query || '';
    const excludeExisting = query.excludeExistingProviders !== 'false';

    const where: any = {
      status: 'active',
    };

    // Exclude users who already have a ServiceProviderProfile
    if (excludeExisting) {
      where.serviceProviderProfile = null;
    }

    // Search by email or phone
    if (searchQuery) {
      where.OR = [
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { email: 'asc' },
      take: 50, // Limit results
    });

    return users;
  });
}

