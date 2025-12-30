import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createServiceRequestSchema, createLeadSchema } from '@bridgechina/shared';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '../utils/r2.js';

const prisma = new PrismaClient();

// Simple geo detection (stub - can be enhanced with geoip-lite)
function detectCity(request: FastifyRequest): string {
  // For now, default to Guangzhou
  // In production, use geoip-lite or similar
  return 'guangzhou';
}

export default async function publicRoutes(fastify: FastifyInstance) {
  // Shopping - Import shopping service modules at the top (needed for multiple endpoints)
  const {
    getCategories: getShoppingCategories,
    searchByKeyword,
    searchByImage,
    getItemDetail,
    getHotItems,
  } = await import('../modules/shopping/shopping.service.js');
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
  fastify.get('/banners', async (request: FastifyRequest) => {
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
      }).then(async (hotels) => {
        return await Promise.all(
          hotels.map(async (hotel) => {
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
      }).then(async (places) => {
        return await Promise.all(
          places.map(async (place) => {
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
      }).then(async (products) => {
        return await Promise.all(
          products.map(async (product) => {
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
      }).then(async (restaurants) => {
        return await Promise.all(
          restaurants.map(async (restaurant) => {
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
      include: { 
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    
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
    
    return hotelsWithGallery;
  });

  fastify.get('/catalog/hotels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
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
    };
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
      include: { 
        city: true,
        coverAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    
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
      include: { city: true },
      orderBy: { created_at: 'desc' },
    });
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
      });
    }
  );

  // Get item detail by external ID
  fastify.get('/shopping/item/:externalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { externalId } = request.params as { externalId: string };
    const item = await getItemDetail(externalId);
    if (!item) {
      reply.status(404).send({ error: 'Item not found' });
      return;
    }
    return item;
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
  fastify.get('/catalog/guides', async (request: FastifyRequest) => {
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
  });

  fastify.get('/catalog/guides/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const guide = await prisma.guideProfile.findUnique({
      where: { user_id: id },
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
  fastify.get('/offers', async (request: FastifyRequest) => {
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
}

