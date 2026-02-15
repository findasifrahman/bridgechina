import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createServiceRequestSchema, createLeadSchema } from '@bridgechina/shared';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../utils/r2.js';
import { prisma } from '../lib/prisma.js';

// Simple geo detection (stub - can be enhanced with geoip-lite)
function detectCity(request: FastifyRequest): string {
  // For now, default to Guangzhou
  // In production, use geoip-lite or similar
  return 'guangzhou';
}

export default async function publicRoutes(fastify: FastifyInstance) {
  // Shopping - Import shopping service modules at the top (needed for multiple endpoints)
  const { getShoppingProviderKey } = await import('../modules/shopping/shopping.provider.js');
  const shoppingProvider = getShoppingProviderKey();
  const shoppingModulePath =
    shoppingProvider === 'shopping_otapi'
      ? '../modules/shopping_otapi/shopping_otapi.service.js'
      : '../modules/shopping/shopping.service.js';

  const {
    getCategories: getShoppingCategories,
    searchByKeyword,
    searchByImage,
    getItemDetail,
    getHotItems,
  } = await import(shoppingModulePath);
  const {
    searchByKeywordSchema,
    searchByImageSchema,
    getHotItemsSchema,
  } = await import('../modules/shopping/shopping.schemas.js');

  // Upload image for shopping search (server-side upload to avoid CORS)
  fastify.post(
    '/shopping/upload-image',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { uploadToR2, getPublicUrl } = await import('../utils/r2.js');
        const data = await request.file();
        
        if (!data) {
          reply.status(400).send({ error: 'No file uploaded' });
          return;
        }

        // Validate file type
        if (!data.mimetype || !data.mimetype.startsWith('image/')) {
          reply.status(400).send({ error: 'File must be an image' });
          return;
        }

        const buffer = await data.toBuffer();
        const sanitizedFilename = data.filename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image';
        const key = `shopping/search/${Date.now()}-${sanitizedFilename}`;
        
        // Upload to R2 server-side
        await uploadToR2(key, buffer, data.mimetype);
        
        const publicUrl = getPublicUrl(key);
        
        fastify.log.info({ key, publicUrl, size: buffer.length }, '[Public Route] Image uploaded for shopping search');
        
        return {
          key,
          publicUrl,
        };
      } catch (error: any) {
        fastify.log.error({ error, stack: error.stack }, '[Public Route] /shopping/upload-image error');
        reply.status(500).send({ error: error.message || 'Failed to upload image' });
      }
    }
  );

  // Public image proxy endpoint - proxy external images to avoid CORS
  fastify.get('/image-proxy', async (request: FastifyRequest, reply: FastifyReply) => {
    const { url: urlParam } = request.query as { url?: string };
    
    if (!urlParam) {
      reply.status(400).send({ error: 'Missing url parameter' });
      return;
    }

    try {
      // Decode URL parameter (it comes URL-encoded from the query string)
      const decodedUrl = decodeURIComponent(urlParam);
      
      // Validate URL to prevent SSRF
      let imageUrl: URL;
      try {
        imageUrl = new URL(decodedUrl);
      } catch (err) {
        fastify.log.warn({ urlParam, decodedUrl, error: err }, '[Public Route] /image-proxy invalid URL');
        reply.status(400).send({ error: 'Invalid URL' });
        return;
      }

      // Only allow specific domains (Alibaba CDN, etc.)
      const allowedDomains = [
        'cbu01.alicdn.com',
        'img.alicdn.com',
        'detail.1688.com',
        'alicdn.com', // Allow any alicdn.com subdomain
        '1688.com', // Allow any 1688.com subdomain
      ];
      
      const hostname = imageUrl.hostname.toLowerCase();
      // Check if hostname ends with or contains any allowed domain
      const isAllowed = allowedDomains.some(domain => {
        const domainLower = domain.toLowerCase();
        return hostname === domainLower || hostname.endsWith('.' + domainLower) || hostname.includes(domainLower);
      });
      
      if (!isAllowed) {
        fastify.log.warn({ hostname, decodedUrl, allowedDomains }, '[Public Route] /image-proxy domain not allowed');
        reply.status(403).send({ error: `Domain not allowed: ${hostname}` });
        return;
      }

      // Fetch the image with proper headers to avoid blocking
      fastify.log.debug({ decodedUrl, hostname }, '[Public Route] /image-proxy fetching image');
      let response: Response;
      try {
        // Create abort controller for timeout (fallback for older Node.js)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          response = await fetch(decodedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://detail.1688.com/',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (fetchError: any) {
        fastify.log.error({ 
          decodedUrl, 
          hostname, 
          error: fetchError.message, 
          name: fetchError.name,
          code: fetchError.code,
          stack: fetchError.stack 
        }, '[Public Route] /image-proxy fetch error (network/timeout)');
        reply.status(500).send({ error: `Failed to fetch image: ${fetchError.message || 'Network error'}` });
        return;
      }
      
      if (!response.ok) {
        fastify.log.warn({ 
          decodedUrl, 
          status: response.status, 
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }, '[Public Route] /image-proxy fetch failed (non-ok response)');
        reply.status(response.status).send({ error: `Failed to fetch image: ${response.statusText}` });
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      let buffer: Buffer;
      try {
        buffer = Buffer.from(await response.arrayBuffer());
      } catch (bufferError: any) {
        fastify.log.error({ 
          decodedUrl, 
          error: bufferError.message,
          stack: bufferError.stack 
        }, '[Public Route] /image-proxy buffer conversion error');
        reply.status(500).send({ error: 'Failed to process image data' });
        return;
      }

      // Set headers
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.send(buffer);
    } catch (error: any) {
      fastify.log.error({ error, urlParam, stack: error.stack }, '[Public Route] /image-proxy error');
      reply.status(500).send({ error: 'Failed to proxy image' });
    }
  });

  // Public media endpoint - serve media asset by ID (proxy to avoid CORS)
  fastify.get('/media/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    
    try {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: params.id },
      });

      if (!asset) {
        reply.status(404).send({ error: 'Media asset not found' });
        return;
      }

      // If we have r2_key, fetch directly from R2 to avoid CORS
      if (asset.r2_key) {
        try {
          const client = getS3Client();
          const bucket = process.env.R2_BUCKET;
          
          if (!bucket) {
            throw new Error('R2_BUCKET not configured');
          }

          const command = new GetObjectCommand({
            Bucket: bucket,
            Key: asset.r2_key,
          });

          const response = await client.send(command);
          
          // Set appropriate headers
          const contentType = asset.mime_type || response.ContentType || 'application/octet-stream';
          reply.header('Content-Type', contentType);
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
          reply.header('Access-Control-Allow-Origin', '*');
          
          // Stream the body
          if (response.Body) {
            const chunks: Uint8Array[] = [];
            for await (const chunk of response.Body as any) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            reply.send(buffer);
            return;
          }
        } catch (r2Error: any) {
          fastify.log.warn({ error: r2Error, assetId: params.id }, '[Public Route] Failed to fetch from R2, falling back to public URL');
        }
      }

      // Fallback: proxy from public URL if available
      if (asset.public_url) {
        try {
          const response = await fetch(asset.public_url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }

          const contentType = asset.mime_type || response.headers.get('content-type') || 'application/octet-stream';
          const buffer = Buffer.from(await response.arrayBuffer());

          reply.header('Content-Type', contentType);
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
          reply.header('Access-Control-Allow-Origin', '*');
          reply.send(buffer);
          return;
        } catch (fetchError: any) {
          fastify.log.error({ error: fetchError, url: asset.public_url }, '[Public Route] Failed to proxy image from public URL');
          reply.status(500).send({ error: 'Failed to fetch image' });
          return;
        }
      }

      // If no public URL, return the asset metadata
      return asset;
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Route] /media/:id error');
      reply.status(500).send({ error: error.message || 'Failed to fetch media asset' });
    }
  });

// Carousel banners endpoint
fastify.get('/banners', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const banners = await prisma.homepageBanner.findMany({
      where: {
        is_active: true,
      },
      include: {
        coverAsset: true,
      },
      orderBy: {
        sort_order: 'asc',
      },
    });

    return banners;
  } catch (error: any) {
    fastify.log.error({ error, stack: error.stack }, '[Banners] Database error');
    // Return empty array if database is unavailable
    return [];
  }
});
  // Homepage data endpoint
  fastify.get('/home', async (request: FastifyRequest) => {
    const { city_slug } = request.query as { city_slug?: string };
    
    // Get city by slug or default to Guangzhou
    let city = null;
    if (city_slug) {
      city = await prisma.city.findFirst({
        where: { slug: city_slug, is_active: true },
      });
    }
    if (!city) {
      city = await prisma.city.findFirst({
        where: { slug: 'guangzhou', is_active: true },
      }) || await prisma.city.findFirst({ where: { is_active: true } });
    }

    const cityId = city?.id;

    // Helper to get gallery assets
    const getGalleryAssets = async (galleryIds: string[] | null) => {
      if (!galleryIds || galleryIds.length === 0) return [];
      return await prisma.mediaAsset.findMany({
        where: { id: { in: galleryIds } },
      });
    };

    // Fetch top items in parallel
    const [hotels, cityPlaces, esimPlans, products, restaurants] = await Promise.all([
      // Top 4 hotels
      prisma.hotel.findMany({
        where: {
          ...(cityId ? { city_id: cityId } : {}),
          verified: true,
        },
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy: { rating: 'desc' },
        take: 4,
      }).then(async (hotels: any[]) => {
        return await Promise.all(
          hotels.map(async (hotel: any) => {
            const galleryIds = (hotel.gallery_asset_ids as string[]) || [];
            const galleryAssets = await getGalleryAssets(galleryIds);
            return {
              ...hotel,
              galleryAssets,
            };
          })
        );
      }),

      // Top 4 city places
      prisma.cityPlace.findMany({
        where: {
          ...(cityId ? { city_id: cityId } : {}),
          is_active: true,
        },
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy: { star_rating: 'desc' },
        take: 4,
      }).then(async (places: any[]) => {
        return await Promise.all(
          places.map(async (place: any) => {
            const galleryIds = (place.gallery_asset_ids as string[]) || [];
            const galleryAssets = await getGalleryAssets(galleryIds);
            return {
              ...place,
              galleryAssets,
            };
          })
        );
      }),

      // Top 4 eSIM plans
      prisma.esimPlan.findMany({
        where: { is_active: true },
        include: {
          coverAsset: true,
        },
        orderBy: { price: 'asc' },
        take: 4,
      }),

      // Top 4 products
      prisma.product.findMany({
        where: { status: 'active' },
        include: {
          coverAsset: true,
          category: true,
        },
        orderBy: { created_at: 'desc' },
        take: 4,
      }).then(async (products: any[]) => {
        return await Promise.all(
          products.map(async (product: any) => {
            const galleryIds = (product.gallery_asset_ids as string[]) || [];
            const galleryAssets = await getGalleryAssets(galleryIds);
            return {
              ...product,
              galleryAssets,
            };
          })
        );
      }),

      // Top 4 restaurants
      prisma.restaurant.findMany({
        where: {
          ...(cityId ? { city_id: cityId } : {}),
          halal_verified: true,
        },
        include: {
          city: true,
          coverAsset: true,
        },
        orderBy: { rating: 'desc' },
        take: 4,
      }).then(async (restaurants: any[]) => {
        return await Promise.all(
          restaurants.map(async (restaurant: any) => {
            const galleryIds = (restaurant.gallery_asset_ids as string[]) || [];
            const galleryAssets = await getGalleryAssets(galleryIds);
            return {
              ...restaurant,
              galleryAssets,
            };
          })
        );
      }),
    ]);

    // Generate featured cards (for now, computed from data)
    const featuredCards = [];
    if (hotels.length > 0) {
      featuredCards.push({
        id: 'featured-hotel',
        type: 'hotel',
        title: hotels[0].name,
        subtitle: `Starting from ¥${hotels[0].price_from || 'N/A'}`,
        image: hotels[0].coverAsset?.public_url || null,
        link: `/services/hotel`,
        badge: 'Featured',
      });
    }
    if (restaurants.length > 0) {
      featuredCards.push({
        id: 'featured-restaurant',
        type: 'restaurant',
        title: 'Halal Food Delivery',
        subtitle: 'Order authentic halal meals',
        image: restaurants[0].coverAsset?.public_url || null,
        link: `/services/halal-food`,
        badge: 'Popular',
      });
    }

    // Fetch featured items grouped by type (with per-type limits)
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

    const featuredItemsByType: Record<string, any[]> = {};
    
    // Fetch featured items for each type
    for (const [entityType, limit] of Object.entries(typeLimits)) {
      const items = await prisma.featuredItem.findMany({
        where: { 
          entity_type: entityType,
          is_active: true,
        },
        orderBy: { sort_order: 'asc' },
        take: limit,
      });
      featuredItemsByType[entityType] = items;
    }
    
    // Combine all featured items for processing
    const allFeaturedItems = Object.values(featuredItemsByType).flat();

    // Fetch entity data for featured items with gallery assets
    const featuredItemsWithData = await Promise.all(
      allFeaturedItems.map(async (item) => {
        let entityData: any = null;
        try {
          switch (item.entity_type) {
            case 'hotel':
              entityData = await prisma.hotel.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'restaurant':
              entityData = await prisma.restaurant.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'food_item':
              entityData = await prisma.foodItem.findUnique({
                where: { id: item.entity_id },
                include: { restaurant: true, category: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'cityplace':
              entityData = await prisma.cityPlace.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'tour':
              entityData = await prisma.tour.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'esim_plan':
              entityData = await prisma.esimPlan.findUnique({
                where: { id: item.entity_id },
                include: { coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'product':
              entityData = await prisma.product.findUnique({
                where: { id: item.entity_id },
                include: { category: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
            case 'transport':
              entityData = await prisma.transportProduct.findUnique({
                where: { id: item.entity_id },
                include: { city: true, coverAsset: true },
              });
              if (entityData) {
                const galleryIds = (entityData.gallery_asset_ids as string[]) || [];
                entityData.galleryAssets = await getGalleryAssets(galleryIds);
              }
              break;
          }
        } catch (error) {
          console.error(`Failed to load featured ${item.entity_type} ${item.entity_id}:`, error);
        }
        return {
          ...item,
          entity: entityData,
        };
      })
    );

    // Group featured items back by type for the response
    const groupedFeaturedItems: Record<string, any[]> = {
      hotels: [],
      restaurants: [],
      food_items: [],
      esim_plans: [],
      cityplaces: [],
      tours: [],
      products: [],
      transport: [],
    };

    featuredItemsWithData.forEach((item) => {
      if (!item.entity) return; // Skip items with no entity data
      
      switch (item.entity_type) {
        case 'hotel':
          groupedFeaturedItems.hotels.push(item);
          break;
        case 'restaurant':
          groupedFeaturedItems.restaurants.push(item);
          break;
        case 'food_item':
          groupedFeaturedItems.food_items.push(item);
          break;
        case 'cityplace':
          groupedFeaturedItems.cityplaces.push(item);
          break;
        case 'tour':
          groupedFeaturedItems.tours.push(item);
          break;
        case 'esim_plan':
          groupedFeaturedItems.esim_plans.push(item);
          break;
        case 'product':
          groupedFeaturedItems.products.push(item);
          break;
        case 'transport':
          groupedFeaturedItems.transport.push(item);
          break;
      }
    });

    return {
      city: city ? { id: city.id, name: city.name, slug: city.slug } : null,
      top_hotels: hotels,
      top_city_places: cityPlaces,
      top_esim_plans: esimPlans,
      top_products: products,
      top_restaurants: restaurants,
      featured_cards: featuredCards.slice(0, 2), // Max 2 cards
      featured_items: featuredItemsWithData.filter(item => item.entity !== null), // Only return items with valid entities
      featured_items_by_type: groupedFeaturedItems,
    };
  });

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
      places.map(async (place: any) => {
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
      include: { 
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    
    // Load gallery assets
    const hotelsWithGallery = await Promise.all(
      hotels.map(async (hotel: any) => {
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
    
    return hotelsWithGallery;
  });

  // NEW: Combined hotel search (internal + external)
  fastify.get('/hotels/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        mode = 'city',
        q = '',
        checkin,
        checkout,
        adults = 1,
        room_qty = 1,
        children_age = '',
        page_number = 1,
      } = request.query as {
        mode?: string;
        q?: string;
        checkin?: string;
        checkout?: string;
        adults?: string;
        room_qty?: string;
        children_age?: string;
        page_number?: string;
      };

      const {
        searchHotels,
        getGuangzhouDestination,
        isGuangzhouQuery,
        upsertExternalHotel,
        searchDestination,
      } = await import('../modules/hotels/bookingcom.service.js');

      // Always fetch internal hotels (max 20)
      let internalHotels: any[] = [];
      try {
        internalHotels = await prisma.hotel.findMany({
          where: {
            verified: true,
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          include: {
            city: true,
            coverAsset: true,
          },
          take: 20,
          orderBy: { name: 'asc' },
        });
      } catch (dbError: any) {
        console.error('[Hotel Search] Database error (continuing with external only):', dbError.message);
        // Continue with empty internal hotels if DB is unavailable
        internalHotels = [];
      }

      // Load gallery for internal hotels
      const internalWithGallery = await Promise.all(
        internalHotels.map(async (hotel) => {
          try {
            const galleryIds = (hotel.gallery_asset_ids as string[]) || [];
            const galleryAssets = galleryIds.length > 0
              ? await prisma.mediaAsset.findMany({
                  where: { id: { in: galleryIds } },
                })
              : [];
            return {
              ...hotel,
              galleryAssets,
              source: 'internal',
            };
          } catch (error) {
            // If gallery loading fails, return hotel without gallery
            return {
              ...hotel,
              galleryAssets: [],
              source: 'internal',
            };
          }
        })
      );

      let externalHotels: any[] = [];
      let blockedExternal = false;
      let blockedReason = '';

      // Handle external search
      if (mode === 'city') {
        // Only Guangzhou allowed for city search
        if (!isGuangzhouQuery(q || 'guangzhou')) {
          blockedExternal = true;
          blockedReason = 'Currently hotel search by city is available only for Guangzhou, China.';
        } else {
          // If dates are NOT provided, just load from database (no API call)
          if (!checkin || !checkout) {
            console.log('[Hotel Search] No dates provided, loading external hotels from database only');
            try {
              // Load external hotels - prefer Guangzhou but show any if available
              const dbHotels = await (prisma as any).externalHotel.findMany({
                where: {
                  provider: 'bookingcom',
                  // Don't filter by city on initial load - show any cached hotels
                },
                take: 20,
                orderBy: { last_synced_at: 'desc' },
              });
              
              console.log('[Hotel Search] Found', dbHotels.length, 'external hotels in database');
              
              externalHotels = dbHotels.map((hotel: any) => ({
                id: hotel.hotel_id,
                name: hotel.name,
                city: hotel.city,
                address: hotel.address,
                star_rating: hotel.star_rating,
                review_score: hotel.review_score,
                review_count: hotel.review_count,
                price_from: hotel.gross_price,
                currency: hotel.currency || 'CNY',
                cover_photo_url: hotel.cover_photo_url,
                photo_urls: (hotel.photo_urls as any) || [],
                source: 'external',
                booking_url: hotel.booking_url,
                has_free_cancellation: hotel.has_free_cancellation,
              }));
              
              if (externalHotels.length === 0) {
                console.log('[Hotel Search] No external hotels found in database');
                blockedReason = 'Please select check-in and check-out dates to search for hotels.';
              } else {
                console.log('[Hotel Search] Loaded', externalHotels.length, 'external hotels from database');
              }
            } catch (dbError: any) {
              console.warn('[Hotel Search] Failed to load external hotels from database:', dbError.message);
              blockedReason = 'Please select check-in and check-out dates to search for hotels.';
            }
          } else {
            // Dates provided - proceed with API call or cache
            try {
              // Validate dates before making API call
              let datesValid = true;
              const checkinDate = new Date(checkin);
              const checkoutDate = new Date(checkout);
              if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
                datesValid = false;
                blockedReason = 'Invalid date format.';
              } else if (checkoutDate <= checkinDate) {
                datesValid = false;
                blockedReason = 'Checkout date must be after checkin date.';
              }

              if (datesValid) {
                const guangzhouDest = await getGuangzhouDestination();
                const searchParams: any = {
                  dest_id: guangzhouDest.dest_id,
                  search_type: guangzhouDest.search_type,
                  adults: parseInt(String(adults)) || 1,
                  room_qty: parseInt(String(room_qty)) || 1,
                  children_age: String(children_age) || '',
                  page_number: parseInt(String(page_number)) || 1,
                  currency_code: 'CNY',
                  languagecode: 'en-us',
                  checkin: checkin || undefined,
                  checkout: checkout || undefined,
                };

                // Check cache first (5 day TTL)
                const CACHE_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
                const cacheKey = `${guangzhouDest.dest_id}-${checkin || ''}-${checkout || ''}-${adults}-${room_qty}-${page_number}`;
                let searchResult: any = null;
                let fromCache = false;
                let cachedData: any = null;
                
                try {
                  // First, try to find fresh cache (within TTL)
                  const cached = await (prisma as any).externalHotelSearchCache.findFirst({
                    where: {
                      provider: 'bookingcom',
                      dest_id: guangzhouDest.dest_id,
                      search_type: guangzhouDest.search_type,
                      checkin: checkin || null,
                      checkout: checkout || null,
                      adults: parseInt(String(adults)) || 1,
                      room_qty: parseInt(String(room_qty)) || 1,
                      page_number: parseInt(String(page_number)) || 1,
                      created_at: {
                        gte: new Date(Date.now() - CACHE_TTL_MS), // 5 days ago
                      },
                    },
                    orderBy: { created_at: 'desc' },
                  });
                  
                  if (cached) {
                    console.log('[Hotel Search] Using cached search results (fresh)');
                    fromCache = true;
                    cachedData = cached;
                  } else {
                    // Try to find any cache (even if expired) as fallback
                    const expiredCache = await (prisma as any).externalHotelSearchCache.findFirst({
                      where: {
                        provider: 'bookingcom',
                        dest_id: guangzhouDest.dest_id,
                        search_type: guangzhouDest.search_type,
                        checkin: checkin || null,
                        checkout: checkout || null,
                        adults: parseInt(String(adults)) || 1,
                        room_qty: parseInt(String(room_qty)) || 1,
                        page_number: parseInt(String(page_number)) || 1,
                      },
                      orderBy: { created_at: 'desc' },
                    });
                    
                    if (expiredCache) {
                      console.log('[Hotel Search] Found expired cache (will use as fallback if API fails)');
                      cachedData = expiredCache;
                    }
                  }
                  
                  if (fromCache && cachedData) {
                    // Reconstruct search result from cache
                    const hotelIds = (cachedData.hotel_ids as any) || [];
                    const externalFromCache = await (prisma as any).externalHotel.findMany({
                      where: {
                        provider: 'bookingcom',
                        hotel_id: { in: hotelIds },
                      },
                    });
                    
                    externalHotels = externalFromCache.map((hotel: any) => ({
                      id: hotel.hotel_id,
                      name: hotel.name,
                      city: hotel.city,
                      address: hotel.address,
                      star_rating: hotel.star_rating,
                      review_score: hotel.review_score,
                      review_count: hotel.review_count,
                      price_from: hotel.gross_price,
                      currency: hotel.currency || 'CNY',
                      cover_photo_url: hotel.cover_photo_url,
                      photo_urls: (hotel.photo_urls as any) || [],
                      source: 'external',
                      booking_url: hotel.booking_url,
                    }));
                  }
                } catch (cacheError: any) {
                  console.warn('[Hotel Search] Cache check failed, will fetch from API:', cacheError.message);
                }
                
                // TEMPORARILY DISABLED CACHE FOR TESTING - Always fetch from API
                // If not from cache, fetch from API
                //if (true) { // Changed from !fromCache to always true for testing
                if (!fromCache){
                  try {
                    console.log('[Hotel Search] Cache disabled for testing - fetching from API (city mode)');
                    searchResult = await searchHotels(searchParams);
                  } catch (apiError: any) {
                    console.error('[Hotel Search] API call failed:', apiError.message);
                    
                    // Fallback: Use cached data if available (even if expired)
                    if (cachedData) {
                      console.log('[Hotel Search] API failed, using cached data as fallback');
                      fromCache = true;
                      const hotelIds = (cachedData.hotel_ids as any) || [];
                      const externalFromCache = await (prisma as any).externalHotel.findMany({
                        where: {
                          provider: 'bookingcom',
                          hotel_id: { in: hotelIds },
                        },
                      });
                      
                      externalHotels = externalFromCache.map((hotel: any) => ({
                        id: hotel.hotel_id,
                        name: hotel.name,
                        city: hotel.city,
                        address: hotel.address,
                        star_rating: hotel.star_rating,
                        review_score: hotel.review_score,
                        review_count: hotel.review_count,
                        price_from: hotel.gross_price,
                        currency: hotel.currency || 'CNY',
                        cover_photo_url: hotel.cover_photo_url,
                        photo_urls: (hotel.photo_urls as any) || [],
                        source: 'external',
                        booking_url: hotel.booking_url,
                      }));
                    } else {
                      // Last resort: Try to find any hotels in Guangzhou from database
                      console.log('[Hotel Search] No cache available, trying to load from database');
                      const dbHotels = await (prisma as any).externalHotel.findMany({
                        where: {
                          provider: 'bookingcom',
                          city: { contains: 'Guangzhou', mode: 'insensitive' },
                        },
                        take: 20,
                        orderBy: { last_synced_at: 'desc' },
                      });
                      
                      if (dbHotels.length > 0) {
                        console.log(`[Hotel Search] Found ${dbHotels.length} hotels in database as fallback`);
                        externalHotels = dbHotels.map((hotel: any) => ({
                          id: hotel.hotel_id,
                          name: hotel.name,
                          city: hotel.city,
                          address: hotel.address,
                          star_rating: hotel.star_rating,
                          review_score: hotel.review_score,
                          review_count: hotel.review_count,
                          price_from: hotel.gross_price,
                          currency: hotel.currency || 'CNY',
                          cover_photo_url: hotel.cover_photo_url,
                          photo_urls: (hotel.photo_urls as any) || [],
                          source: 'external',
                          booking_url: hotel.booking_url,
                        }));
                      }
                    }
                    
                    // Don't throw error, just return what we have
                    searchResult = null;
                  }
                
                  // Only process and cache if we have valid search results
                  if (searchResult?.status === true && searchResult?.data?.hotels && Array.isArray(searchResult.data.hotels)) {
                    // Cache the search results
                    try {
                      const hotelIds = searchResult.data.hotels
                        .slice(0, 20)
                        .map((h: any) => String(h.hotel_id || h.id || h.property?.id));
                      
                      await (prisma as any).externalHotelSearchCache.create({
                        data: {
                          provider: 'bookingcom',
                          dest_id: guangzhouDest.dest_id,
                          search_type: guangzhouDest.search_type,
                          checkin: checkin || null,
                          checkout: checkout || null,
                          adults: parseInt(String(adults)) || 1,
                          room_qty: parseInt(String(room_qty)) || 1,
                          page_number: parseInt(String(page_number)) || 1,
                          currency_code: 'CNY',
                          languagecode: 'en-us',
                          hotel_ids: hotelIds,
                          raw_json: searchResult.data,
                        },
                      });
                      console.log('[Hotel Search] Cached search results');
                    } catch (cacheError: any) {
                      console.warn('[Hotel Search] Failed to cache search results:', cacheError.message);
                    }
                    
                    // Try to upsert hotels to database (but don't fail if DB is down)
                    try {
                      for (const hotel of searchResult.data.hotels.slice(0, 20)) {
                        await upsertExternalHotel(hotel);
                      }
                    } catch (dbError: any) {
                      console.warn('[Hotel Search] Failed to cache external hotels (DB unavailable):', dbError.message);
                    }
                    
                    // Process API results if not already loaded from cache
                    if (!fromCache) {
                      // Try to fetch from database, but if DB is down, use raw API results
                      try {
                        const hotelIds = searchResult.data.hotels
                          .slice(0, 20)
                          .map((h: any) => String(h.id || h.hotel_id));
                        
                        const externalFromDb = await (prisma as any).externalHotel.findMany({
                          where: {
                            provider: 'bookingcom',
                            hotel_id: { in: hotelIds },
                          },
                        });

                        if (externalFromDb.length > 0) {
                          externalHotels = externalFromDb.map((hotel: any) => ({
                            id: hotel.hotel_id,
                            name: hotel.name,
                            city: hotel.city,
                            address: hotel.address,
                            star_rating: hotel.star_rating,
                            review_score: hotel.review_score,
                            review_count: hotel.review_count,
                            price_from: hotel.gross_price,
                            currency: hotel.currency || 'CNY',
                            cover_photo_url: hotel.cover_photo_url,
                            photo_urls: (hotel.photo_urls as any) || [],
                            source: 'external',
                            booking_url: hotel.booking_url,
                          }));
                        } else {
                          // No cached results, use raw API results
                          externalHotels = searchResult.data.hotels.slice(0, 20).map((h: any) => {
                            const property = h.property || {};
                            const imageUrl = property.photoUrls?.[0] || 
                                             h.photoUrls?.[0] || 
                                             property.photos?.[0]?.url_max || 
                                             property.photos?.[0]?.url_original ||
                                             h.photos?.[0]?.url_max || 
                                             h.photos?.[0]?.url_original ||
                                             h.photoUrl ||
                                             h.imageUrl ||
                                             null;
                            
                            const photoUrls = property.photoUrls || 
                                             h.photoUrls || 
                                             (property.photos ? property.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                             (h.photos ? h.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                             [];
                            
                            return {
                              id: String(h.hotel_id || h.id || property.id || ''),
                              name: property.name || h.name || 'Unknown Hotel',
                              city: property.city_name || h.city_name || h.city,
                              address: property.address || h.address || h.hotel_address,
                              star_rating: property.propertyClass || property.accuratePropertyClass || 0,
                              review_score: property.reviewScore || 0,
                              review_count: property.reviewCount || 0,
                              price_from: (h.priceBreakdown || property.priceBreakdown || {})?.grossPrice?.value || null,
                              currency: (h.priceBreakdown || property.priceBreakdown || {})?.grossPrice?.currency || h.currency || property.currency || 'CNY',
                              cover_photo_url: imageUrl,
                              photo_urls: photoUrls,
                              source: 'external',
                              booking_url: null,
                            };
                          });
                        }
                      } catch (dbError: any) {
                        console.warn('[Hotel Search] Failed to fetch cached hotels (DB unavailable), using raw API results');
                        externalHotels = searchResult.data.hotels.slice(0, 20).map((h: any) => {
                          const property = h.property || {};
                          const imageUrl = property.photoUrls?.[0] || 
                                           h.photoUrls?.[0] || 
                                           property.photos?.[0]?.url_max || 
                                           property.photos?.[0]?.url_original ||
                                           h.photos?.[0]?.url_max || 
                                           h.photos?.[0]?.url_original ||
                                           h.photoUrl ||
                                           h.imageUrl ||
                                           null;
                          
                          const photoUrls = property.photoUrls || 
                                           h.photoUrls || 
                                           (property.photos ? property.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                           (h.photos ? h.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                           [];
                          
                          return {
                            id: String(h.hotel_id || h.id || property.id || ''),
                            name: property.name || h.name || 'Unknown Hotel',
                            city: property.city_name || h.city_name || h.city,
                            address: property.address || h.address || h.hotel_address,
                            star_rating: property.propertyClass || property.accuratePropertyClass || 0,
                            review_score: property.reviewScore || 0,
                            review_count: property.reviewCount || 0,
                            price_from: h.priceBreakdown?.grossPrice?.value || null,
                            currency: h.priceBreakdown?.grossPrice?.currency || h.currency || property.currency || 'CNY',
                            cover_photo_url: imageUrl,
                            photo_urls: photoUrls,
                            source: 'external',
                            booking_url: null,
                          };
                        });
                      }
                    }
                  }
                }
              } else {
                // Dates invalid, skip external search
                console.warn('[Hotel Search] Invalid dates, skipping external search');
              }
            } catch (error: any) {
              console.error('[Hotel Search] External search error:', error);
              // Don't block, just return empty external results
              if (error.message.includes('Checkout date must be after checkin')) {
                blockedReason = error.message;
              }
            }
          }
        }
      } else if (mode === 'name') {
        // Hotel name search - allow but mark if outside Guangzhou
        // Validate query is not empty
        if (!q || q.trim() === '') {
          blockedReason = 'Please enter a hotel name to search.';
        } else if (!checkin || !checkout) {
          // If dates are NOT provided, just load from database (no API call)
          console.log('[Hotel Search] No dates provided for name search, loading external hotels from database only');
          try {
            // Try to find hotels by name in database
            const dbHotels = await (prisma as any).externalHotel.findMany({
              where: {
                provider: 'bookingcom',
                name: { contains: q, mode: 'insensitive' },
              },
              take: 20,
              orderBy: { last_synced_at: 'desc' },
            });
            
            externalHotels = dbHotels.map((hotel: any) => ({
              id: hotel.hotel_id,
              name: hotel.name,
              city: hotel.city,
              address: hotel.address,
              star_rating: hotel.star_rating,
              review_score: hotel.review_score,
              review_count: hotel.review_count,
              price_from: hotel.gross_price,
              currency: hotel.currency || 'CNY',
              cover_photo_url: hotel.cover_photo_url,
              photo_urls: (hotel.photo_urls as any) || [],
              source: 'external',
              booking_url: hotel.booking_url,
            }));
            
            if (externalHotels.length === 0) {
              blockedReason = 'Please select check-in and check-out dates to search for hotels.';
            }
          } catch (dbError: any) {
            console.warn('[Hotel Search] Failed to load external hotels from database (name search):', dbError.message);
            blockedReason = 'Please select check-in and check-out dates to search for hotels.';
          }
        } else {
          // Dates provided - proceed with API call or cache
          try {
            // Validate dates before making API call
            let datesValid = true;
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);
            if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
              datesValid = false;
              blockedReason = 'Invalid date format.';
            } else if (checkoutDate <= checkinDate) {
              datesValid = false;
              blockedReason = 'Checkout date must be after checkin date.';
            } else {
              // Check if arrival is in the past (but allow today)
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const arrivalDateOnly = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate());
              const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              
              if (arrivalDateOnly < todayDateOnly) {
                datesValid = false;
                blockedReason = 'Arrival date must be today or in the future.';
              }
            }

            if (datesValid) {
              // Validate query is not empty
              if (!q || q.trim() === '') {
                blockedReason = 'Please enter a hotel name to search.';
                datesValid = false;
              }
            }

            if (datesValid) {
              // Auto-add Guangzhou to hotel name search if no city specified
              let searchQuery = q.trim();
              const hasCity = /guangzhou|广州|guang zhou/i.test(searchQuery);
              if (!hasCity) {
                searchQuery = `${searchQuery} Guangzhou`;
                console.log('[Hotel Search] Auto-added Guangzhou to hotel name search:', searchQuery);
              }
              
              // First, search for destination
              const destResults = await searchDestination(searchQuery);
              
              // API returns { status: true, message: "Success", data: [...] }
              if (destResults?.status === true && destResults?.data && Array.isArray(destResults.data) && destResults.data.length > 0) {
                // Check if results are in China/Guangzhou
                const chinaResults = destResults.data.filter((d: any) => 
                  d.country?.toLowerCase().includes('china') ||
                  d.city_name?.toLowerCase().includes('guangzhou')
                );

                if (chinaResults.length === 0 && destResults.data.length > 0) {
                  // Results outside China - mark but allow
                  blockedReason = 'External results (may be outside Guangzhou)';
                }

                // Use first result for hotel search
                const firstDest = destResults.data[0];
                const searchParams: any = {
                  dest_id: firstDest.dest_id,
                  search_type: firstDest.search_type || (firstDest.dest_type === 'city' ? 'CITY' : 'HOTEL'),
                  adults: parseInt(String(adults)) || 1,
                  room_qty: parseInt(String(room_qty)) || 1,
                  children_age: String(children_age) || '',
                  page_number: parseInt(String(page_number)) || 1,
                  currency_code: 'CNY',
                  languagecode: 'en-us',
                  checkin: checkin || undefined,
                  checkout: checkout || undefined,
                };

                // Check cache first (5 day TTL)
                const CACHE_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
                let searchResult: any = null;
                let fromCache = false;
                let cachedData: any = null;
                
                try {
                  // First, try to find fresh cache (within TTL)
                  const cached = await (prisma as any).externalHotelSearchCache.findFirst({
                    where: {
                      provider: 'bookingcom',
                      dest_id: firstDest.dest_id,
                      search_type: firstDest.search_type || (firstDest.dest_type === 'city' ? 'CITY' : 'HOTEL'),
                      checkin: checkin || null,
                      checkout: checkout || null,
                      adults: parseInt(String(adults)) || 1,
                      room_qty: parseInt(String(room_qty)) || 1,
                      page_number: parseInt(String(page_number)) || 1,
                      created_at: {
                        gte: new Date(Date.now() - CACHE_TTL_MS), // 5 days ago
                      },
                    },
                    orderBy: { created_at: 'desc' },
                  });
                  
                  if (cached) {
                    console.log('[Hotel Search] Using cached search results (fresh, name mode)');
                    fromCache = true;
                    cachedData = cached;
                  } else {
                    // Try to find any cache (even if expired) as fallback
                    const expiredCache = await (prisma as any).externalHotelSearchCache.findFirst({
                      where: {
                        provider: 'bookingcom',
                        dest_id: firstDest.dest_id,
                        search_type: firstDest.search_type || (firstDest.dest_type === 'city' ? 'CITY' : 'HOTEL'),
                        checkin: checkin || null,
                        checkout: checkout || null,
                        adults: parseInt(String(adults)) || 1,
                        room_qty: parseInt(String(room_qty)) || 1,
                        page_number: parseInt(String(page_number)) || 1,
                      },
                      orderBy: { created_at: 'desc' },
                    });
                    
                    if (expiredCache) {
                      console.log('[Hotel Search] Found expired cache (will use as fallback if API fails, name mode)');
                      cachedData = expiredCache;
                    }
                  }
                  
                  if (fromCache && cachedData) {
                    // Reconstruct search result from cache
                    const hotelIds = (cachedData.hotel_ids as any) || [];
                    const externalFromCache = await (prisma as any).externalHotel.findMany({
                      where: {
                        provider: 'bookingcom',
                        hotel_id: { in: hotelIds },
                      },
                    });
                    
                    externalHotels = externalFromCache.map((hotel: any) => ({
                      id: hotel.hotel_id,
                      name: hotel.name,
                      city: hotel.city,
                      address: hotel.address,
                      star_rating: hotel.star_rating,
                      review_score: hotel.review_score,
                      review_count: hotel.review_count,
                      price_from: hotel.gross_price,
                      currency: hotel.currency || 'CNY',
                      cover_photo_url: hotel.cover_photo_url,
                      photo_urls: (hotel.photo_urls as any) || [],
                      source: 'external',
                      booking_url: hotel.booking_url,
                    }));
                  }
                } catch (cacheError: any) {
                  console.warn('[Hotel Search] Cache check failed (name mode), will fetch from API:', cacheError.message);
                }
                
                // TEMPORARILY DISABLED CACHE FOR TESTING - Always fetch from API
                // If not from cache, fetch from API
                if (true) { // Changed from !fromCache to always true for testing
                  try {
                    console.log('[Hotel Search] Cache disabled for testing - fetching from API (name mode)');
                    searchResult = await searchHotels(searchParams);
                  } catch (apiError: any) {
                    console.error('[Hotel Search] API call failed (name mode):', apiError.message);
                    
                    // Fallback: Use cached data if available (even if expired)
                    if (cachedData) {
                      console.log('[Hotel Search] API failed, using cached data as fallback (name mode)');
                      fromCache = true;
                      const hotelIds = (cachedData.hotel_ids as any) || [];
                      const externalFromCache = await (prisma as any).externalHotel.findMany({
                        where: {
                          provider: 'bookingcom',
                          hotel_id: { in: hotelIds },
                        },
                      });
                      
                      externalHotels = externalFromCache.map((hotel: any) => ({
                        id: hotel.hotel_id,
                        name: hotel.name,
                        city: hotel.city,
                        address: hotel.address,
                        star_rating: hotel.star_rating,
                        review_score: hotel.review_score,
                        review_count: hotel.review_count,
                        price_from: hotel.gross_price,
                        currency: hotel.currency || 'CNY',
                        cover_photo_url: hotel.cover_photo_url,
                        photo_urls: (hotel.photo_urls as any) || [],
                        source: 'external',
                        booking_url: hotel.booking_url,
                      }));
                    } else {
                      // Last resort: Try to find hotels by name in database
                      console.log('[Hotel Search] No cache available, trying to load from database (name mode)');
                      const dbHotels = await (prisma as any).externalHotel.findMany({
                        where: {
                          provider: 'bookingcom',
                          name: { contains: q, mode: 'insensitive' },
                        },
                        take: 20,
                        orderBy: { last_synced_at: 'desc' },
                      });
                      
                      if (dbHotels.length > 0) {
                        console.log(`[Hotel Search] Found ${dbHotels.length} hotels in database as fallback (name mode)`);
                        externalHotels = dbHotels.map((hotel: any) => ({
                          id: hotel.hotel_id,
                          name: hotel.name,
                          city: hotel.city,
                          address: hotel.address,
                          star_rating: hotel.star_rating,
                          review_score: hotel.review_score,
                          review_count: hotel.review_count,
                          price_from: hotel.gross_price,
                          currency: hotel.currency || 'CNY',
                          cover_photo_url: hotel.cover_photo_url,
                          photo_urls: (hotel.photo_urls as any) || [],
                          source: 'external',
                          booking_url: hotel.booking_url,
                        }));
                      } else {
                        blockedReason = apiError.message || 'No hotels found.';
                      }
                    }
                    
                    // Don't throw error, just return what we have
                    searchResult = null;
                  }
                
                  // Only process and cache if we have valid search results
                  if (searchResult?.status === true && searchResult?.data?.hotels && Array.isArray(searchResult.data.hotels)) {
                    // Cache the search results
                    try {
                      const hotelIds = searchResult.data.hotels
                        .slice(0, 20)
                        .map((h: any) => String(h.hotel_id || h.id || h.property?.id));
                      
                      await (prisma as any).externalHotelSearchCache.create({
                        data: {
                          provider: 'bookingcom',
                          dest_id: firstDest.dest_id,
                          search_type: firstDest.search_type || (firstDest.dest_type === 'city' ? 'CITY' : 'HOTEL'),
                          checkin: checkin || null,
                          checkout: checkout || null,
                          adults: parseInt(String(adults)) || 1,
                          room_qty: parseInt(String(room_qty)) || 1,
                          page_number: parseInt(String(page_number)) || 1,
                          currency_code: 'CNY',
                          languagecode: 'en-us',
                          hotel_ids: hotelIds,
                          raw_json: searchResult.data,
                        },
                      });
                      console.log('[Hotel Search] Cached search results (name mode)');
                    } catch (cacheError: any) {
                      console.warn('[Hotel Search] Failed to cache search results (name mode):', cacheError.message);
                    }
                    
                    // Try to upsert hotels to database (but don't fail if DB is down)
                    try {
                      for (const hotel of searchResult.data.hotels.slice(0, 20)) {
                        await upsertExternalHotel(hotel);
                      }
                    } catch (dbError: any) {
                      console.warn('[Hotel Search] Failed to cache external hotels (DB unavailable, name mode):', dbError.message);
                    }
                    
                    // Process API results if not already loaded from cache
                    if (!fromCache) {
                      // Try to fetch from database, but if DB is down, use raw API results
                      try {
                        const hotelIds = searchResult.data.hotels
                          .slice(0, 20)
                          .map((h: any) => String(h.id || h.hotel_id));
                        
                        const externalFromDb = await (prisma as any).externalHotel.findMany({
                          where: {
                            provider: 'bookingcom',
                            hotel_id: { in: hotelIds },
                          },
                        });

                        if (externalFromDb.length > 0) {
                          externalHotels = externalFromDb.map((hotel: any) => ({
                            id: hotel.hotel_id,
                            name: hotel.name,
                            city: hotel.city,
                            address: hotel.address,
                            star_rating: hotel.star_rating,
                            review_score: hotel.review_score,
                            review_count: hotel.review_count,
                            price_from: hotel.gross_price,
                            currency: hotel.currency || 'CNY',
                            cover_photo_url: hotel.cover_photo_url,
                            photo_urls: (hotel.photo_urls as any) || [],
                            source: 'external',
                            booking_url: hotel.booking_url,
                          }));
                        } else {
                          // No cached results, use raw API results
                          externalHotels = searchResult.data.hotels.slice(0, 20).map((h: any) => {
                            const property = h.property || {};
                            const imageUrl = property.photoUrls?.[0] || 
                                             h.photoUrls?.[0] || 
                                             property.photos?.[0]?.url_max || 
                                             property.photos?.[0]?.url_original ||
                                             h.photos?.[0]?.url_max || 
                                             h.photos?.[0]?.url_original ||
                                             h.photoUrl ||
                                             h.imageUrl ||
                                             null;
                            
                            const photoUrls = property.photoUrls || 
                                             h.photoUrls || 
                                             (property.photos ? property.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                             (h.photos ? h.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                             [];
                            
                            return {
                              id: String(h.hotel_id || h.id || property.id || ''),
                              name: property.name || h.name || 'Unknown Hotel',
                              city: property.city_name || h.city_name || h.city,
                              address: property.address || h.address || h.hotel_address,
                              star_rating: property.propertyClass || property.accuratePropertyClass || 0,
                              review_score: property.reviewScore || 0,
                              review_count: property.reviewCount || 0,
                              price_from: (h.priceBreakdown || property.priceBreakdown || {})?.grossPrice?.value || null,
                              currency: (h.priceBreakdown || property.priceBreakdown || {})?.grossPrice?.currency || h.currency || property.currency || 'CNY',
                              cover_photo_url: imageUrl,
                              photo_urls: photoUrls,
                              source: 'external',
                              booking_url: null,
                            };
                          });
                        }
                      } catch (dbError: any) {
                        console.warn('[Hotel Search] Failed to fetch cached hotels (DB unavailable, name mode), using raw API results');
                        externalHotels = searchResult.data.hotels.slice(0, 20).map((h: any) => {
                          const property = h.property || {};
                          const imageUrl = property.photoUrls?.[0] || 
                                           h.photoUrls?.[0] || 
                                           property.photos?.[0]?.url_max || 
                                           property.photos?.[0]?.url_original ||
                                           h.photos?.[0]?.url_max || 
                                           h.photos?.[0]?.url_original ||
                                           h.photoUrl ||
                                           h.imageUrl ||
                                           null;
                          
                          const photoUrls = property.photoUrls || 
                                           h.photoUrls || 
                                           (property.photos ? property.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                           (h.photos ? h.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                                           [];
                          
                          return {
                            id: String(h.hotel_id || h.id || property.id || ''),
                            name: property.name || h.name || 'Unknown Hotel',
                            city: property.city_name || h.city_name || h.city,
                            address: property.address || h.address || h.hotel_address,
                            star_rating: property.propertyClass || property.accuratePropertyClass || 0,
                            review_score: property.reviewScore || 0,
                            review_count: property.reviewCount || 0,
                            price_from: h.priceBreakdown?.grossPrice?.value || null,
                            currency: h.priceBreakdown?.grossPrice?.currency || h.currency || property.currency || 'CNY',
                            cover_photo_url: imageUrl,
                            photo_urls: photoUrls,
                            source: 'external',
                            booking_url: null,
                          };
                        });
                      }
                    }
                  }
                }
              } else {
                // No destination found
                console.warn('[Hotel Search] No destination found for name search:', q);
                blockedReason = 'No hotels found matching your search.';
              }
            } else {
              // Dates invalid, skip external search
              console.warn('[Hotel Search] Invalid dates for name search, skipping external search');
            }
          } catch (error: any) {
            console.error('[Hotel Search] External name search error:', error);
            // Don't block, just return empty external results
            if (error.message.includes('Checkout date must be after checkin')) {
              blockedReason = error.message;
            } else if (error.message.includes('Arrival date must be today or in the future')) {
              blockedReason = error.message;
            } else if (error.message.includes('Invalid date format')) {
              blockedReason = error.message;
            }
          }
        }
      }

      return {
        internal: internalWithGallery,
        external: externalHotels,
        ...(blockedExternal && { blockedExternal: true, blockedReason }),
        ...(blockedReason && !blockedExternal && { blockedReason }),
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Hotel Search] Error');
      reply.status(500).send({ error: error.message || 'Failed to search hotels' });
    }
  });

  // NEW: Get external hotel details
  fastify.get('/hotels/external/:hotelId/details', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { hotelId } = request.params as { hotelId: string };
      const {
        adults = 1,
        room_qty = 1,
        children_age = '',
      } = request.query as {
        adults?: string;
        room_qty?: string;
        children_age?: string;
      };

        const {
        getHotelDetails,
        getDescriptionAndInfo,
        getPaymentFeatures,
        // getHotelReviewScores, // Commented out - not using review scores for now
        getHotelReviewsFilterMetadata,
        // getPopularAttractionNearBy, // Commented out - not using attractions
        upsertExternalHotel,
      } = await import('../modules/hotels/bookingcom.service.js');

      // Check if we have cached details (within 24h)
      const cached = await (prisma as any).externalHotel.findUnique({
        where: {
          provider_hotel_id: {
            provider: 'bookingcom',
            hotel_id: hotelId,
          },
        },
      });

      // First, try to use data from searchHotels response (raw_search_json) which has more info
      const searchData = cached?.raw_search_json;
      const property = searchData?.property || {};
      
      // Extract all images from property.photoUrls (array of URLs)
      const allPhotoUrls = property.photoUrls || cached?.photo_urls || [];
      
      // If we have search data, use it to enrich the hotel record
      if (searchData && property) {
        console.log('[Hotel Details] Using searchHotels data from cache for hotel:', hotelId);
        console.log('[Hotel Details] Found', allPhotoUrls.length, 'images in property.photoUrls');
        
        // Extract accessibility label from searchData
        const accessibilityLabel = searchData.accessibilityLabel || '';
        
        // Update hotel with searchHotels data (more complete than getHotelDetails)
        await (prisma as any).externalHotel.update({
          where: {
            provider_hotel_id: {
              provider: 'bookingcom',
              hotel_id: hotelId,
            },
          },
          data: {
            // Save all images from property.photoUrls to gallery_photos
            gallery_photos: allPhotoUrls.length > 0 ? allPhotoUrls : cached?.gallery_photos || [],
            // Also update photo_urls with all images
            photo_urls: allPhotoUrls.length > 0 ? allPhotoUrls : cached?.photo_urls || [],
            // Update other fields from property object
            name: property.name || cached?.name,
            city: property.city_name || cached?.city,
            address: property.address || cached?.address,
            latitude: property.latitude || cached?.latitude,
            longitude: property.longitude || cached?.longitude,
            star_rating: property.propertyClass || property.accuratePropertyClass || cached?.star_rating,
            review_score: property.reviewScore || cached?.review_score,
            review_score_word: property.reviewScoreWord || cached?.review_score_word,
            review_count: property.reviewCount || cached?.review_count,
            currency: property.currency || cached?.currency || 'CNY',
            // Update from priceBreakdown if available
            gross_price: searchData.priceBreakdown?.grossPrice?.value || cached?.gross_price,
            strikethrough_price: searchData.priceBreakdown?.strikethroughPrice?.value || cached?.strikethrough_price,
            has_free_cancellation: accessibilityLabel.toLowerCase().includes('free cancellation') || cached?.has_free_cancellation || false,
            includes_taxes_and_charges: accessibilityLabel.toLowerCase().includes('includes taxes and charges') || cached?.includes_taxes_and_charges || false,
            last_synced_at: new Date(),
          },
        });
      }

      // Always fetch fresh details when user clicks hotel details page
      // searchHotels data is good for list view, but getHotelDetails has more complete info
      const shouldRefresh = true; // Always refresh when user explicitly views details
      
      if (shouldRefresh) {
        console.log('[Hotel Details] User viewing hotel details, fetching fresh data from API for hotel:', hotelId);
        
        // Set default dates if not provided (for getHotelDetails which requires dates)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultCheckin = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const defaultCheckout = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Fetch all details with error handling - if one fails, continue with others
        let detailsResp: any = null;
        let descriptionResp: any = null;
        let paymentResp: any = null;
        let reviewScoresResp: any = null;
        let attractionsResp: any = null; // Not used - API call commented out
        
        try {
          // getHotelDetails requires dates, so use defaults if not provided
          detailsResp = await getHotelDetails(hotelId, {
            adults: parseInt(String(adults)) || 1,
            room_qty: parseInt(String(room_qty)) || 1,
            children_age: String(children_age) || '',
            arrival_date: defaultCheckin,
            departure_date: defaultCheckout,
          } as any); // Type assertion needed because TypeScript doesn't know about arrival_date/departure_date yet
          console.log('[Hotel Details] getHotelDetails completed');
        } catch (error: any) {
          console.warn('[Hotel Details] getHotelDetails failed, will use cached data:', error.message);
          // Continue with other API calls even if getHotelDetails fails
        }
        
        try {
          descriptionResp = await getDescriptionAndInfo(hotelId);
          console.log('[Hotel Details] getDescriptionAndInfo completed');
        } catch (error: any) {
          console.warn('[Hotel Details] getDescriptionAndInfo failed:', error.message);
        }
        
        try {
          paymentResp = await getPaymentFeatures(hotelId);
          console.log('[Hotel Details] getPaymentFeatures completed');
        } catch (error: any) {
          console.warn('[Hotel Details] getPaymentFeatures failed:', error.message);
        }
        
        // Commented out - not using review scores for now
        // try {
        //   reviewScoresResp = await getHotelReviewScores(hotelId);
        //   console.log('[Hotel Details] getHotelReviewScores completed');
        // } catch (error: any) {
        //   console.warn('[Hotel Details] getHotelReviewScores failed:', error.message);
        // }
        
        // Commented out - not using attractions
        // try {
        //   attractionsResp = await getPopularAttractionNearBy(hotelId);
        //   console.log('[Hotel Details] getPopularAttractionNearBy completed');
        // } catch (error: any) {
        //   console.warn('[Hotel Details] getPopularAttractionNearBy failed:', error.message);
        // }
        
        console.log('[Hotel Details] API calls completed for hotel:', hotelId);

        // Extract data from responses (use cached data as fallback if API failed)
        const details = detailsResp?.data || cached?.raw_details_json || {};
        const description = descriptionResp?.data || cached?.description || [];
        const payment = paymentResp?.data || cached?.payment_features || [];
        const reviewScores = null; // Commented out - not using review scores for now
        // const reviewScores = reviewScoresResp?.data || cached?.review_scores || [];
        const reviewFilters: any = cached?.review_filters || {}; // getHotelReviewsFilterMetadata is commented out
        const attractions = attractionsResp?.data || cached?.attractions || {};

        // Extract gallery photos from rooms (all rooms, not just first)
        const allRoomPhotos: any[] = [];
        if (details.rooms && typeof details.rooms === 'object') {
          Object.values(details.rooms).forEach((room: any) => {
            if (room.photos && Array.isArray(room.photos)) {
              allRoomPhotos.push(...room.photos);
            }
          });
        }
        
        // Combine images from multiple sources:
        // 1. Room photos from getHotelDetails
        // 2. Photos from getHotelDetails
        // 3. property.photoUrls from searchHotels (if available in cached raw_search_json)
        // 4. Existing gallery_photos from cache
        const searchPhotoUrls = cached?.raw_search_json?.property?.photoUrls || [];
        const allPhotos = [
          ...allRoomPhotos,
          ...(details.photos || []),
          ...searchPhotoUrls,
          ...(cached?.gallery_photos || []),
        ];
        
        // Deduplicate by URL (extract base URL without query params for comparison)
        const seenUrls = new Set<string>();
        const galleryPhotos = allPhotos.filter((url: any) => {
          if (!url) return false;
          const urlStr = typeof url === 'string' ? url : (url.url || url.url_max || url.url_original || '');
          if (!urlStr) return false;
          
          // Extract base URL (without query params) for deduplication
          const baseUrl = urlStr.split('?')[0];
          if (seenUrls.has(baseUrl)) return false;
          seenUrls.add(baseUrl);
          return true;
        }).map((url: any) => typeof url === 'string' ? url : (url.url || url.url_max || url.url_original || ''));
        
        console.log('[Hotel Details] Combined gallery photos:', galleryPhotos.length, 'unique images (from', allPhotos.length, 'total)');

        // Update database with all extracted data
        await (prisma as any).externalHotel.update({
          where: {
            provider_hotel_id: {
              provider: 'bookingcom',
              hotel_id: hotelId,
            },
          },
          data: {
            raw_details_json: details,
            description: description,
            payment_features: payment,
            review_scores: reviewScores,
            review_filters: reviewFilters,
            attractions: attractions,
            gallery_photos: galleryPhotos,
            highlights: details?.property_highlight_strip || cached?.highlights,
            facilities: details?.facilities_block || cached?.facilities,
            booking_url: details?.url || cached?.booking_url,
            last_synced_at: new Date(),
          },
        });
      }

      // Fetch updated hotel
      const hotel = await (prisma as any).externalHotel.findUnique({
        where: {
          provider_hotel_id: {
            provider: 'bookingcom',
            hotel_id: hotelId,
          },
        },
      });

      if (!hotel) {
        reply.status(404).send({ error: 'Hotel not found' });
        return;
      }

      // Extract gallery photos from various possible locations and deduplicate
      // Priority: gallery_photos (saved from getHotelDetails) > photo_urls > raw_search_json > raw_details_json
      const allPhotos = [
        ...(hotel.gallery_photos || []),
        ...(hotel.photo_urls && Array.isArray(hotel.photo_urls) ? hotel.photo_urls : []),
        ...(hotel.raw_search_json?.property?.photoUrls && Array.isArray(hotel.raw_search_json.property.photoUrls) ? hotel.raw_search_json.property.photoUrls : []),
        ...(hotel.raw_details_json?.rooms ? 
          Object.values(hotel.raw_details_json.rooms).flatMap((room: any) => room.photos || []) : []),
      ];
      
      // Deduplicate by URL (extract base URL without query params for comparison)
      const seenUrls = new Set<string>();
      const galleryPhotos = allPhotos.filter((url: any) => {
        if (!url) return false;
        const urlStr = typeof url === 'string' ? url : (url.url || url.url_max || url.url_original || '');
        if (!urlStr) return false;
        
        // Extract base URL (without query params) for deduplication
        const baseUrl = urlStr.split('?')[0];
        if (seenUrls.has(baseUrl)) return false;
        seenUrls.add(baseUrl);
        return true;
      }).map((url: any) => typeof url === 'string' ? url : (url.url || url.url_max || url.url_original || ''));
      
      console.log('[Hotel Details] Returning', galleryPhotos.length, 'unique gallery photos for hotel:', hotelId, '(from', allPhotos.length, 'total)');
      
      // Extract facilities from facilities_block
      const facilitiesBlock = hotel.facilities || hotel.raw_details_json?.facilities_block || {};
      const facilities = {
        popular: facilitiesBlock.facilities?.filter((f: any) => f.popular) || [],
        all: facilitiesBlock.facilities || [],
        ...facilitiesBlock,
      };
      
      // Extract highlights from property_highlight_strip
      const highlights = hotel.highlights || hotel.raw_details_json?.property_highlight_strip || [];
      
      // Extract description (can be array or object)
      const description = hotel.description || hotel.raw_details_json?.description || [];
      
      // Extract review scores
      const reviewScores = hotel.review_scores || hotel.raw_details_json?.review_scores || [];
      
      // Extract attractions
      const attractions = hotel.attractions || hotel.raw_details_json?.attractions || {};
      const popularAttractions = attractions.popular_landmarks || attractions.closest_landmarks || [];
      
      // Extract payment features and map creditcard_id to names
      const creditCardMap: Record<number, string> = {
        1: 'Visa',
        2: 'Mastercard',
        3: 'American Express',
        5: 'Diners Club',
        7: 'JCB',
        18: 'UnionPay',
        44: 'Discover',
      };
      
      const paymentFeaturesRaw = hotel.payment_features || [];
      const paymentFeatures = Array.isArray(paymentFeaturesRaw)
        ? paymentFeaturesRaw.map((p: any) => {
            const cardName = p.creditcard_id ? creditCardMap[p.creditcard_id] : null;
            return {
              name: cardName || p.name || `Card ${p.creditcard_id || 'Unknown'}`,
              creditcard_id: p.creditcard_id,
              bookable: p.bookable,
              payable: p.payable,
            };
          })
        : [];
      
      // Extract price from product_price_breakdown or composite_price_breakdown
      const priceBreakdown = hotel.raw_details_json?.product_price_breakdown || hotel.raw_details_json?.composite_price_breakdown || {};
      const grossAmountPerNight = priceBreakdown.gross_amount_per_night?.value || priceBreakdown.gross_amount?.value || null;
      const grossAmount = priceBreakdown.gross_amount?.value || null;
      const netAmount = priceBreakdown.net_amount?.value || null;
      const currency = priceBreakdown.gross_amount?.currency || priceBreakdown.gross_amount_per_night?.currency || hotel.currency || 'CNY';
      
      // Extract sustainability info
      const sustainability = hotel.raw_details_json?.sustainability || null;
      
      // Extract family facilities
      const familyFacilities = hotel.raw_details_json?.family_facilities || [];
      
      return {
        id: hotel.hotel_id,
        name: hotel.name,
        city: hotel.city,
        address: hotel.address,
        star_rating: hotel.star_rating,
        review_score: hotel.review_score,
        review_count: hotel.review_count,
        review_score_word: hotel.review_score_word,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        cover_photo_url: hotel.cover_photo_url,
        photo_urls: (hotel.photo_urls as any) || [],
        gallery_photos: galleryPhotos,
        highlights: highlights,
        facilities: facilities,
        description: description,
        payment_features: paymentFeatures,
        review_scores: reviewScores,
        review_filters: hotel.review_filters || {},
        attractions: popularAttractions,
        booking_url: hotel.booking_url,
        price_from: grossAmountPerNight || grossAmount || hotel.gross_price,
        price_total: grossAmount,
        price_per_night: grossAmountPerNight,
        net_amount: netAmount,
        strikethrough_price: hotel.strikethrough_price,
        currency: currency,
        has_free_cancellation: hotel.has_free_cancellation,
        includes_taxes_and_charges: hotel.includes_taxes_and_charges,
        hotel_include_breakfast: hotel.raw_details_json?.hotel_include_breakfast || false,
        sustainability: sustainability,
        family_facilities: familyFacilities,
        source: 'external',
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Hotel Details] Error');
      reply.status(500).send({ error: error.message || 'Failed to fetch hotel details' });
    }
  });

  // UPDATED: Get hotel details (internal or external)
  fastify.get('/catalog/hotels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // Check if it's a UUID (internal) or external hotel ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      // Internal hotel
      const hotel = await prisma.hotel.findUnique({
        where: { id },
        include: {
          city: true,
          coverAsset: true,
        },
      });

      if (!hotel) {
        reply.status(404).send({ error: 'Hotel not found' });
        return;
      }

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
        source: 'internal',
      };
    } else {
      // External hotel - redirect to external details endpoint
      const externalDetails = await fastify.inject({
        method: 'GET',
        url: `/api/public/hotels/external/${id}/details`,
        query: request.query as any,
      });

      if (externalDetails.statusCode === 404) {
        reply.status(404).send({ error: 'Hotel not found' });
        return;
      }

      return JSON.parse(externalDetails.body);
    }
  });

  fastify.get('/catalog/restaurants', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        halal_verified: true,
      },
      include: { 
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    
    // Load gallery assets
    const restaurantsWithGallery = await Promise.all(
      restaurants.map(async (restaurant: any) => {
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
    
    return restaurantsWithGallery;
  });

  fastify.get('/catalog/restaurants/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        city: true,
        coverAsset: true,
        foodItems: {
          where: { is_available: true },
          include: {
            category: true,
            coverAsset: true,
          },
          take: 10,
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!restaurant) {
      reply.status(404).send({ error: 'Restaurant not found' });
      return;
    }

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

  fastify.get('/catalog/medical', async (request: FastifyRequest) => {
    const { city_id, type } = request.query as { city_id?: string; type?: string };
    const medical = await prisma.medicalCenter.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
        ...(type ? { type } : {}),
        verified: true,
      },
      include: {
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    return medical;
  });

  fastify.get('/catalog/medical/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const medical = await prisma.medicalCenter.findFirst({
      where: { id },
      include: {
        city: true,
        coverAsset: true,
      },
    });
    if (!medical) {
      return { error: 'Medical center not found' };
    }
    return medical;
  });

  fastify.get('/catalog/tours', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const tours = await prisma.tour.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
      },
      include: { 
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    
    // Load gallery assets
    const toursWithGallery = await Promise.all(
      tours.map(async (tour: any) => {
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
    
    return toursWithGallery;
  });

  fastify.get('/catalog/tours/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        city: true,
        coverAsset: true,
        cityPlaces: {
          include: {
            cityPlace: {
              include: {
                coverAsset: true,
              },
            },
          },
        },
      },
    });

    if (!tour) {
      reply.status(404).send({ error: 'Tour not found' });
      return;
    }

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

  fastify.get('/catalog/transport', async (request: FastifyRequest) => {
    const { city_id } = request.query as { city_id?: string };
    const transport = await prisma.transportProduct.findMany({
      where: {
        ...(city_id ? { city_id } : {}),
      },
      include: { city: true, coverAsset: true },
      orderBy: { created_at: 'desc' },
    });
    return transport;
  });

  fastify.get('/catalog/transport/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const transport = await prisma.transportProduct.findUnique({
      where: { id: id },
      include: {
        city: true,
        coverAsset: true,
      },
    });

    if (!transport) {
      reply.status(404).send({ error: 'Transport service not found' });
      return;
    }

    return transport;
  });

  // Food Categories - Public endpoint
  fastify.get('/catalog/food-categories', async (request: FastifyRequest) => {
    const { is_active } = request.query as { is_active?: string };
    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }
    const categories = await prisma.foodCategory.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });
    return categories;
  });

  // Food Items - Public endpoint
  fastify.get('/catalog/food-items', async (request: FastifyRequest) => {
    const { restaurant_id, category_id, is_available, is_halal, search, limit = '50' } = request.query as any;
    const limitNum = parseInt(limit);

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

    const items = await prisma.foodItem.findMany({
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
      orderBy: { sort_order: 'asc' },
      take: limitNum,
    });

    // Load gallery assets for each item
    const itemsWithGallery = await Promise.all(
      items.map(async (item: any) => {
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

    return itemsWithGallery;
  });

  // Shopping - Public endpoints (TMAPI Integration)
  // Get shopping categories (TMAPI categories)
  fastify.get('/shopping/categories', async () => {
    return getShoppingCategories();
  });

  // Get hot items by category (loads from DB cache)
  fastify.get('/shopping/hot', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = getHotItemsSchema.parse(request.query);
      const page = parseInt((request.query as any).page || '1');
      const pageSize = parseInt((request.query as any).pageSize || '20');
      fastify.log.info({ query, page, pageSize }, '[Public Route] /shopping/hot parsed query');
      return getHotItems(query.category, page, pageSize);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, query: request.query }, '[Public Route] /shopping/hot error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  // Keyword search with rate limiting
  fastify.get(
    '/shopping/search',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        console.log('[Public Route] /shopping/search called with query:', request.query);
        const query = searchByKeywordSchema.parse(request.query);
        console.log('[Public Route] Parsed query:', query);
        
        const results = await searchByKeyword(query.keyword, {
          category: query.category,
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          language: query.language || 'zh',
        });
        
        console.log('[Public Route] Returning results:', {
          itemsCount: results.items.length,
          totalCount: results.totalCount,
          page: results.page,
          totalPages: results.totalPages,
        });
        return results;
      } catch (error: any) {
        console.error('[Public Route] /shopping/search error:', {
          message: error.message,
          stack: error.stack,
          query: request.query,
        });
        reply.status(500).send({ 
          error: error.message || 'Failed to search products',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }
  );

  // Image search with stricter rate limiting
  fastify.post(
    '/shopping/search/image',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest) => {
      const body = searchByImageSchema.parse(request.body);
      return searchByImage(body.r2_public_url, {
        category: body.category,
        page: body.page,
        pageSize: body.pageSize,
        sort: body.sort,
        language: body.language || 'zh',
      });
    }
  );

  // Get item detail by external ID
  fastify.get('/shopping/item/:externalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { externalId } = request.params as { externalId: string };
    const query = request.query as { language?: string };
    const language = query.language === 'en' ? 'en' : 'zh';
    const item = await getItemDetail(externalId, language);
    if (!item) {
      reply.status(404).send({ error: 'Item not found' });
      return;
    }
    return item;
  });

  // Get recent searches (distinct keywords from search cache)
  fastify.get('/shopping/recent-searches', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { limit?: string; language?: string };
      const limit = parseInt(query.limit || '8', 10);
      const language = query.language || 'zh';

      // Get recent search cache entries
      const recentSearches = await prisma.externalSearchCache.findMany({
        where: {
          source: 'tmapi_1688',
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit * 3, // Get more to filter distinct
      });

      // Extract and normalize keywords from query_json
      const keywords = new Map<string, Date>(); // Map<normalizedKeyword, mostRecentDate>
      
      for (const search of recentSearches) {
        try {
          const queryJson = search.query_json as any;
          let keyword: string | undefined;

          // Handle different query_json shapes
          if (typeof queryJson === 'string') {
            try {
              const parsed = JSON.parse(queryJson);
              keyword = parsed.keyword || parsed.keywords;
            } catch {
              // Not JSON, skip
            }
          } else if (typeof queryJson === 'object' && queryJson !== null) {
            keyword = queryJson.keyword || queryJson.keywords;
          }

          if (keyword && typeof keyword === 'string' && keyword.trim()) {
            const normalized = keyword.trim().toLowerCase();
            // Only keep if we don't have it yet, or this one is more recent
            if (!keywords.has(normalized) || (search.created_at && search.created_at > (keywords.get(normalized) || new Date(0)))) {
              keywords.set(normalized, search.created_at || new Date());
            }
          }
        } catch (error) {
          // Skip invalid entries
          continue;
        }
      }

      // Convert to array and sort by date, take limit
      const result = Array.from(keywords.entries())
        .sort((a, b) => b[1].getTime() - a[1].getTime())
        .slice(0, limit)
        .map(([keyword]) => keyword);

      return result;
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Route] /shopping/recent-searches error');
      reply.status(500).send({ error: error.message || 'Failed to get recent searches' });
    }
  });

  // Translate product title (stub implementation with caching)
  fastify.post('/shopping/translate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { text: string; targetLang?: string; externalId?: string };
      
      if (!body.text) {
        reply.status(400).send({ error: 'text is required' });
        return;
      }

      const targetLang = body.targetLang || 'en';
      const externalId = body.externalId;

      // If externalId provided, check cache first
      if (externalId) {
        const cached = await prisma.externalCatalogItem.findUnique({
          where: {
            source_external_id: {
              source: 'tmapi_1688',
              external_id: externalId,
            },
          },
        });

        if (cached?.title_en) {
          return { translated: cached.title_en, cached: true };
        }
      }

      // TODO: Implement actual translation (Google Translate API, DeepL, etc.)
      // For now, return a placeholder
      const translated = `[TODO: Translate "${body.text}" to ${targetLang}]`;

      // If externalId provided, cache the translation
      if (externalId) {
        await prisma.externalCatalogItem.update({
          where: {
            source_external_id: {
              source: 'tmapi_1688',
              external_id: externalId,
            },
          },
          data: {
            title_en: translated,
          },
        }).catch(() => {
          // Item might not exist yet, ignore
        });
      }

      return { translated, cached: false };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Route] /shopping/translate error');
      reply.status(500).send({ error: error.message || 'Failed to translate' });
    }
  });

  // Legacy: Internal products (keep for backward compatibility)
  fastify.get('/shopping/products/internal', async (request: FastifyRequest) => {
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

    let category = await prisma.serviceCategory.findUnique({
      where: { key: body.category_key },
    });

    // Create category if it doesn't exist (for guide, etc.)
    if (!category) {
      const categoryNames: Record<string, string> = {
        guide: 'Guide Service',
        hotel: 'Hotel Booking',
        transport: 'Transport',
        halal_food: 'Halal Food',
        medical: 'Medical Assistance',
        translation_help: 'Translation & Help',
        shopping_service: 'Shopping Service',
        tours: 'Tours',
        esim: 'eSIM Plans',
      };
      category = await prisma.serviceCategory.create({
        data: {
          key: body.category_key,
          name: categoryNames[body.category_key] || body.category_key,
        },
      });
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

    // Build request payload with source metadata
    const requestPayload = {
      ...(body.request_payload || {}),
      source: 'web_form',
      created_via: req.user?.id ? 'service_page' : 'public_form',
    };

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
        request_payload: requestPayload,
        status: 'new',
      },
    });

    // Create category-specific booking record
    const payload = body.request_payload as any;
    
    if (body.category_key === 'hotel') {
      const hotelBookingData: any = {
        request_id: serviceRequest.id,
        checkin: payload.checkin ? new Date(payload.checkin) : null,
        checkout: payload.checkout ? new Date(payload.checkout) : null,
        guests: payload.guests || null,
        rooms: payload.rooms || null,
        adults: payload.adults || 1,
        room_qty: payload.room_qty || payload.rooms || 1,
        children_age: payload.children_age || null,
        budget_min: payload.budget_min || null,
        budget_max: payload.budget_max || null,
        preferred_area: payload.preferred_area || null,
        hotel_source: payload.hotel_source || 'INTERNAL',
        external_hotel_id: payload.external_hotel_id || null,
        hotel_id: payload.hotel_id || null, // Keep for backward compatibility
      };

      await prisma.hotelBooking.create({
        data: hotelBookingData,
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
    }
    // Note: eSIM requests store plan_id in request_payload, no separate booking table needed
    // 'esim' is not a valid category_key in the schema, so no check needed

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

  // Guides endpoints
  fastify.get('/catalog/guides', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { city_id } = request.query as { city_id?: string };
      const guides = await prisma.guideProfile.findMany({
        where: {
          ...(city_id ? { city_id } : {}),
          verified: true,
        },
        include: {
          city: true,
          coverAsset: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { rating: 'desc' },
      });
      
      return guides;
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Guides] Database error');
      // Return empty array if database is unavailable
      return [];
    }
  });

  fastify.get('/catalog/guides/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const guide = await prisma.guideProfile.findFirst({
      where: { id: id } as any,
      include: {
        city: true,
        coverAsset: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!guide) {
      reply.status(404).send({ error: 'Guide not found' });
      return;
    }

    return guide;
  });

  // Food items detail endpoint
  fastify.get('/catalog/food-items/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const foodItem = await prisma.foodItem.findUnique({
      where: { id },
      include: {
        restaurant: {
          include: {
            city: true,
            coverAsset: true,
          },
        },
        category: true,
        coverAsset: true,
      },
    });

    if (!foodItem) {
      reply.status(404).send({ error: 'Food item not found' });
      return;
    }

    // Load gallery assets
    const galleryIds = (foodItem.gallery_asset_ids as string[]) || [];
    const galleryAssets = galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds } },
        })
      : [];

    return {
      ...foodItem,
      galleryAssets,
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

    const validTypes = ['hotel', 'restaurant', 'medical', 'tour', 'transport', 'cityplace', 'product', 'guide', 'food', 'esim'];
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
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
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
          verified: true,
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
          verified: true,
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
  // AI Chat Agent endpoint
  fastify.post('/ai-search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { query, sessionId } = request.body as { query?: string; sessionId?: string };
      
      if (!query || !query.trim()) {
        return { 
          response: 'Hi! 👋 I\'m your BridgeChina assistant. How can I help you today?',
          images: [],
        };
      }

      // Generate session ID if not provided
      const chatSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Import chat agent
      const { processChatMessage } = await import('../modules/chat/chat.agent.js');
      
      // Process message
      const result = await processChatMessage(query.trim(), chatSessionId);

      return {
        response: result.message,
        images: result.images || [],
        sessionId: chatSessionId,
        shouldReset: result.shouldReset || false,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Chat Agent] Error processing message');
      reply.status(500).send({
        error: 'Failed to process chat message',
        response: 'I apologize, I encountered an error. Please try again or contact us via WhatsApp.',
      });
    }
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

  // Get single eSIM plan by ID
  fastify.get('/catalog/esim/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const plan = await prisma.esimPlan.findUnique({
      where: { id },
      include: { coverAsset: true },
    });

    if (!plan) {
      reply.status(404).send({ error: 'eSIM plan not found' });
      return;
    }

    return plan;
  });

  // Get homepage blocks (public read-only)
  fastify.get('/homepage/blocks', async () => {
    return prisma.homepageBlock.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  });

  // Get active service offers
  fastify.get('/offers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date();
      const offers = await prisma.serviceBasedOffer.findMany({
        where: {
          is_active: true,
          OR: [
            { valid_from: null, valid_until: null },
            { valid_from: { lte: now }, valid_until: { gte: now } },
            { valid_from: { lte: now }, valid_until: null },
            { valid_from: null, valid_until: { gte: now } },
          ],
        },
        include: {
          coverAsset: true,
        },
        orderBy: [
          { valid_from: 'asc' },
          { updated_at: 'desc' },
        ],
        take: 10, // Return more than 4 so frontend can choose
      });

      // Load gallery assets
      const offersWithGallery = await Promise.all(
        offers.map(async (offer: any) => {
          try {
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
          } catch (error) {
            // If gallery loading fails, return offer without gallery
            return {
              ...offer,
              galleryAssets: [],
            };
          }
        })
      );

      return offersWithGallery;
    } catch (error: any) {
      // Check if it's a database connection error
      if (error.name === 'PrismaClientInitializationError' || error.message?.includes('Can\'t reach database server')) {
        fastify.log.warn('[Offers] Database connection unavailable - returning empty array');
        return [];
      }
      fastify.log.error({ error, stack: error.stack }, '[Offers] Database error');
      // Return empty array if database is unavailable
      return [];
    }
  });

  // Get public configuration (whatsapp number, etc.)
  fastify.get('/config', async () => {
    return {
      whatsappNumber: process.env.BRIDGECHINA_SERVICE_PROVIDER_NUMBER || '',
    };
  });
}

