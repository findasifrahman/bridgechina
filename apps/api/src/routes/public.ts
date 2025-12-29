import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createServiceRequestSchema, createLeadSchema } from '@bridgechina/shared';

const prisma = new PrismaClient();

// Simple geo detection (stub - can be enhanced with geoip-lite)
function detectCity(request: FastifyRequest): string {
  // For now, default to Guangzhou
  // In production, use geoip-lite or similar
  return 'guangzhou';
}

export default async function publicRoutes(fastify: FastifyInstance) {
  // Get cities
  fastify.get('/cities', async () => {
    const cities = await prisma.city.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return cities;
  });

  // Get city places
  fastify.get('/catalog/cityplaces', async (request: FastifyRequest) => {
    const { city_id, slug, limit } = request.query as { city_id?: string; slug?: string; limit?: string };
    const places = await prisma.cityPlace.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        ...(slug ? { slug } : {}),
        is_active: true,
      },
      include: {
        city: true,
        coverAsset: true,
        tourLinks: {
          include: { tour: true },
        },
      },
      orderBy: { star_rating: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

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

    return placesWithGallery;
  });

  fastify.get('/catalog/cityplaces/:id', async (request: FastifyRequest) => {
    const params = request.params as { id: string };
    // Try to find by ID first, then by slug
    const place = await prisma.cityPlace.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id },
        ],
        is_active: true,
      },
      include: {
        city: true,
        coverAsset: true,
        tourLinks: {
          include: { tour: true },
        },
      },
    });
    if (!place) {
      return { error: 'Place not found' };
    }

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

  // Get catalog items
  fastify.get('/catalog/hotels', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const hotels = await prisma.hotel.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        verified: true,
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return hotels;
  });

  fastify.get('/catalog/restaurants', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        halal_verified: true,
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return restaurants;
  });

  fastify.get('/catalog/medical', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const medical = await prisma.medicalCenter.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        verified: true,
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return medical;
  });

  fastify.get('/catalog/tours', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const tours = await prisma.tour.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return tours;
  });

  fastify.get('/catalog/transport', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const transport = await prisma.transportProduct.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
      },
      include: { city: true },
      orderBy: { created_at: 'desc' },
    });
    return transport;
  });

  // Shopping - Public endpoints
  fastify.get('/shopping/categories', async () => {
    return prisma.productCategory.findMany({
      where: { parent_id: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  });

  fastify.get('/shopping/products', async (request: FastifyRequest) => {
    const { category_id, search, limit = '20', offset = '0' } = request.query as {
      category_id?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
    
    const where: any = {
      status: 'active',
    };
    
    if (category_id) {
      where.category_id = category_id;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    
    return products;
  });

  fastify.get('/shopping/products/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    
    if (!product || product.status !== 'active') {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }
    
    return product;
  });

  // Blog posts
  fastify.get('/blog', async (request: FastifyRequest) => {
    const { limit = '10', offset = '0' } = request.query as { limit?: string; offset?: string };
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: { published_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    return posts;
  });

  fastify.get('/blog/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string };
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!post || post.status !== 'published') {
      reply.status(404).send({ error: 'Post not found' });
      return;
    }

    return post;
  });

  // Submit service request (guest or authenticated)
  fastify.post('/service-request', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createServiceRequestSchema.parse(request.body);
    const req = request as any;

    const category = await prisma.serviceCategory.findUnique({
      where: { key: body.category_key },
    });

    if (!category) {
      reply.status(400).send({ error: 'Invalid category' });
      return;
    }

    // Create lead if guest user
    let leadId = null;
    if (!req.user?.id) {
      const lead = await prisma.lead.create({
        data: {
          name: body.customer_name,
          phone: body.phone,
          whatsapp: body.whatsapp || null,
          email: body.email || null,
          source: 'website',
          city_id: body.city_id,
          status: 'new',
        },
      });
      leadId = lead.id;
    }

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        category_id: category.id,
        city_id: body.city_id,
        user_id: req.user?.id || null,
        lead_id: leadId,
        customer_name: body.customer_name,
        phone: body.phone,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        request_payload: body.request_payload as any,
        status: 'new',
      },
    });

    // Create category-specific booking record
    const payload = body.request_payload as any;
    
    if (body.category_key === 'hotel' && payload.checkin && payload.checkout) {
      await prisma.hotelBooking.create({
        data: {
          request_id: serviceRequest.id,
          checkin: new Date(payload.checkin),
          checkout: new Date(payload.checkout),
          guests: payload.guests || 1,
          rooms: payload.rooms || 1,
          budget_min: payload.budget_min || null,
          budget_max: payload.budget_max || null,
          preferred_area: payload.preferred_area || null,
        },
      });
    } else if (body.category_key === 'transport' && payload.pickup_text && payload.dropoff_text) {
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
    } else if (body.category_key === 'halal_food' && payload.delivery_address_text) {
      await prisma.foodDelivery.create({
        data: {
          request_id: serviceRequest.id,
          delivery_address_text: payload.delivery_address_text,
          meal_type: payload.meal_type || null,
          spicy_level: payload.spicy_level || null,
          allergies: payload.allergies || null,
          people_count: payload.people_count || 1,
        },
      });
    } else if (body.category_key === 'medical') {
      await prisma.medicalAssist.create({
        data: {
          request_id: serviceRequest.id,
          urgency: payload.urgency || 'medium',
          symptoms_text: payload.symptoms_text || null,
          preferred_language: payload.preferred_language || 'English',
          appointment_time: payload.appointment_time ? new Date(payload.appointment_time) : null,
          translator_required: payload.translator_required || false,
        },
      });
    } else if (body.category_key === 'translation_help') {
      await prisma.translationTask.create({
        data: {
          request_id: serviceRequest.id,
          context_text: payload.context_text || null,
          location_text: payload.location_text || null,
          scheduled_time: payload.scheduled_time ? new Date(payload.scheduled_time) : null,
        },
      });
    } else if (body.category_key === 'tours') {
      await prisma.tourBooking.create({
        data: {
          request_id: serviceRequest.id,
          date: payload.date ? new Date(payload.date) : null,
          group_size: payload.group_size || 1,
          preferences: payload.preferences ? ({ text: payload.preferences } as any) : null,
        },
      });
    } else if (body.category_key === 'esim') {
      // eSIM requests store plan_id in request_payload, no separate booking table needed
    }

    return serviceRequest;
  });

  // Submit lead
  fastify.post('/lead', async (request: FastifyRequest) => {
    const body = createLeadSchema.parse(request.body);

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        source: body.source || 'website',
        city_id: body.city_id || null,
        notes: body.notes || null,
        status: 'new',
      },
    });

    return lead;
  });

  // Geo detection
  fastify.get('/geo', async (request: FastifyRequest) => {
    const citySlug = detectCity(request);
    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
    });
    return {
      city: city || { slug: 'guangzhou', name: 'Guangzhou' },
      detected: true,
    };
  });

  // Get reviews for an entity
  fastify.get('/reviews', async (request: FastifyRequest) => {
    const { entity_type, entity_id, limit = '50' } = request.query as {
      entity_type?: string;
      entity_id?: string;
      limit?: string;
    };

    if (!entity_type || !entity_id) {
      return { reviews: [], total: 0 };
    }

    const validTypes = ['hotel', 'restaurant', 'medical', 'tour', 'transport', 'cityplace', 'product', 'guide'];
    if (!validTypes.includes(entity_type)) {
      return { reviews: [], total: 0 };
    }

    const reviews = await prisma.review.findMany({
      where: {
        entity_type,
        entity_id,
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    return {
      reviews,
      averageRating: avgRating,
      total: reviews.length,
    };
  });

  // Search endpoint
  fastify.get('/search', async (request: FastifyRequest) => {
    const { q } = request.query as { q?: string };
    if (!q || q.length < 2) {
      return { hotels: [], restaurants: [], tours: [], medical: [], esim: [], blog: [] };
    }

    const query = q.toLowerCase();
    const [hotels, restaurants, tours, medical, esim, blog] = await Promise.all([
      prisma.hotel.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { city: true },
      }),
      prisma.restaurant.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          halal_verified: true,
        },
        take: 5,
        include: { city: true },
      }),
      prisma.tour.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { city: true },
      }),
      prisma.medicalCenter.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { city: true },
      }),
      prisma.esimPlan.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { region_text: { contains: query, mode: 'insensitive' } },
          ],
          is_active: true,
        },
        take: 5,
      }),
      prisma.blogPost.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
          ],
          status: 'published',
        },
        take: 5,
      }),
    ]);

    return { hotels, restaurants, tours, medical, esim, blog };
  });

  // AI Search (mocked)
  fastify.post('/ai-search', async (request: FastifyRequest) => {
    const { query } = request.body as { query?: string };
    
    if (!query) {
      return { response: 'How can I help you today?' };
    }

    const q = query.toLowerCase();
    let response = 'I can help you with: ';
    const suggestions: string[] = [];

    if (q.includes('hotel') || q.includes('stay') || q.includes('accommodation')) {
      suggestions.push('hotel booking');
      response += 'hotel booking, ';
    }
    if (q.includes('transport') || q.includes('pickup') || q.includes('airport')) {
      suggestions.push('airport pickup');
      response += 'airport pickup, ';
    }
    if (q.includes('food') || q.includes('halal') || q.includes('restaurant')) {
      suggestions.push('halal food delivery');
      response += 'halal food delivery, ';
    }
    if (q.includes('medical') || q.includes('doctor') || q.includes('hospital')) {
      suggestions.push('medical assistance');
      response += 'medical assistance, ';
    }
    if (q.includes('esim') || q.includes('sim') || q.includes('data')) {
      suggestions.push('eSIM plans');
      response += 'eSIM plans, ';
    }

    if (suggestions.length === 0) {
      response = 'I can help you with hotels, transport, halal food, medical assistance, eSIM plans, and tours. What do you need?';
    } else {
      response = response.slice(0, -2) + '. Would you like to know more about any of these?';
    }

    return {
      response,
      suggestions,
      nextActions: suggestions.map((s) => ({
        text: `Learn more about ${s}`,
        action: `/services/${s.replace(' ', '-')}`,
      })),
    };
  });

  // Gallery
  fastify.get('/gallery', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    return prisma.galleryImage.findMany({
      where: {
        is_active: true,
        ...(city_id ? { city_id } : {}),
      },
      include: { asset: true, city: true },
      orderBy: { sort_order: 'asc' },
    });
  });

  // eSIM catalog
  fastify.get('/catalog/esim', async (request: FastifyRequest) => {
    const { region, min_price, max_price } = request.query as any;
    const where: any = { is_active: true };
    if (region) {
      where.region_text = { contains: region, mode: 'insensitive' };
    }
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price);
      if (max_price) where.price.lte = parseFloat(max_price);
    }
    return prisma.esimPlan.findMany({
      where,
      include: { coverAsset: true },
      orderBy: { price: 'asc' },
    });
  });

  // Get homepage blocks (public read-only)
  fastify.get('/homepage/blocks', async () => {
    return prisma.homepageBlock.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  });

  // Homepage data endpoint
  fastify.get('/home', async (request: FastifyRequest) => {
    const { city_slug } = request.query as { city_slug?: string };
    
    // Get city by slug or default to Guangzhou
    const city = await prisma.city.findFirst({
      where: {
        ...(city_slug ? { slug: city_slug } : { slug: 'guangzhou' }),
        is_active: true,
      },
    });

    const cityId = city?.id;

    // Get top hotels
    const topHotels = await prisma.hotel.findMany({
      where: {
        ...(cityId ? { city_id: cityId } : {}),
        verified: true,
      },
      include: {
        city: true,
        coverAsset: true,
      },
      orderBy: { rating: 'desc' },
      take: 10,
    });

    // Get top restaurants
    const topRestaurants = await prisma.restaurant.findMany({
      where: {
        ...(cityId ? { city_id: cityId } : {}),
        halal_verified: true,
      },
      include: {
        city: true,
        coverAsset: true,
      },
      orderBy: { rating: 'desc' },
      take: 10,
    });

    // Get top city places
    const topCityPlaces = await prisma.cityPlace.findMany({
      where: {
        ...(cityId ? { city_id: cityId } : {}),
        is_active: true,
      },
      include: {
        city: true,
        coverAsset: true,
      },
      orderBy: { star_rating: 'desc' },
      take: 10,
    });

    // Get top eSIM plans
    const topEsimPlans = await prisma.esimPlan.findMany({
      where: { is_active: true },
      include: { coverAsset: true },
      orderBy: { price: 'asc' },
      take: 10,
    });

    // Get top products
    const topProducts = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        category: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    // Get featured items (from FeaturedItem model)
    const featuredItemsRaw = await prisma.featuredItem.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      take: 50,
    });

    // Load entities for featured items
    const featuredItems = await Promise.all(
      featuredItemsRaw.map(async (item) => {
        let entity: any = null;
        try {
          switch (item.entity_type) {
            case 'hotel':
              entity = await prisma.hotel.findUnique({ where: { id: item.entity_id }, include: { city: true, coverAsset: true } });
              break;
            case 'restaurant':
              entity = await prisma.restaurant.findUnique({ where: { id: item.entity_id }, include: { city: true, coverAsset: true } });
              break;
            case 'food_item':
              entity = await prisma.foodItem.findUnique({ where: { id: item.entity_id }, include: { restaurant: true, coverAsset: true } });
              break;
            case 'cityplace':
              entity = await prisma.cityPlace.findUnique({ where: { id: item.entity_id }, include: { city: true, coverAsset: true } });
              break;
            case 'tour':
              entity = await prisma.tour.findUnique({ where: { id: item.entity_id }, include: { city: true, coverAsset: true } });
              break;
            case 'esim_plan':
              entity = await prisma.esimPlan.findUnique({ where: { id: item.entity_id }, include: { coverAsset: true } });
              break;
            case 'product':
              entity = await prisma.product.findUnique({ where: { id: item.entity_id }, include: { category: true, coverAsset: true } });
              break;
            case 'transport':
              entity = await prisma.transportProduct.findUnique({ where: { id: item.entity_id }, include: { city: true, coverAsset: true } });
              break;
          }
        } catch (e) {
          console.error(`Failed to load entity for featured item ${item.id}:`, e);
        }
        return { ...item, entity };
      })
    );

    // Filter out items with null entities and group by type
    const featuredItemsByType: any = {
      hotels: [],
      restaurants: [],
      food_items: [],
      esim_plans: [],
      cityplaces: [],
      tours: [],
      products: [],
      transport: [],
    };

    featuredItems.filter(item => item.entity).forEach((item) => {
      const type = item.entity_type;
      if (featuredItemsByType[type]) {
        featuredItemsByType[type].push(item);
      }
    });

    // Get featured cards (from HomepageBlock)
    const featuredCards = await prisma.homepageBlock.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      take: 10,
    });

    return {
      city: city || null,
      top_hotels: topHotels,
      top_restaurants: topRestaurants,
      top_city_places: topCityPlaces,
      top_esim_plans: topEsimPlans,
      top_products: topProducts,
      featured_items: featuredItems,
      featured_items_by_type: featuredItemsByType,
      featured_cards: featuredCards,
    };
  });

  // Get service offers
  fastify.get('/offers', async () => {
    return prisma.serviceBasedOffer.findMany({
      where: {
        is_active: true,
        valid_from: { lte: new Date() },
        valid_until: { gte: new Date() },
      },
      include: {
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  });

  // Get homepage banners
  fastify.get('/banners', async () => {
    return prisma.homepageBanner.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      take: 10,
    });
  });
}

