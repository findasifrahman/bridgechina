import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return (
    error?.name === 'PrismaClientInitializationError' ||
    message.includes("Can't reach database server") ||
    message.includes('P1001') ||
    message.includes('P1017')
  );
}

let shoppingDbAvailable = true;

function normalizeGalleryAssets(product: any, mediaById: Map<string, any>) {
  const ids = Array.isArray(product.gallery_asset_ids)
    ? product.gallery_asset_ids.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
    : [];
  return ids
    .map((id: string) => mediaById.get(id))
    .filter(Boolean)
    .map((asset: any) => asset?.public_url || asset?.thumbnail_url)
    .filter(Boolean);
}

function normalizeLocalProductCard(product: any, mediaById: Map<string, any> = new Map()) {
  const imageUrl = product.coverAsset?.public_url || product.coverAsset?.thumbnail_url || undefined;
  const gallery = normalizeGalleryAssets(product, mediaById);
  const images = [imageUrl, ...gallery].filter(Boolean);
  return {
    source: 'shopping_db',
    externalId: product.external_id || product.id,
    id: product.id,
    title: product.title,
    priceMin: product.price,
    priceMax: product.price,
    currency: product.currency || 'BDT',
    imageUrl,
    images: images.length ? images : undefined,
    sellerName: product.seller?.sellerProfile?.shop_name || product.seller?.email || 'ChinaBuyBD',
    sourceUrl: product.source_url || undefined,
    totalSold: product.review_count || 0,
    minimumOrderQty: product.minimum_order_qty || 1,
  };
}

function normalizeLocalSkuRows(product: any, coverImageUrl?: string) {
  const rows = Array.isArray(product.specifications) ? product.specifications : [];
  return rows
    .map((row: any, index: number) => {
      if (!row || typeof row !== 'object') return null;
      const label = String(row.label || row.name || row.option || row.title || `Option ${index + 1}`).trim();
      const sku = String(row.sku || row.spec || row.code || '').trim();
      const price = row.price !== undefined && row.price !== null && row.price !== '' ? Number(row.price) : product.price;
      const stock = row.stock_qty !== undefined && row.stock_qty !== null && row.stock_qty !== '' ? Number(row.stock_qty) : product.stock_qty;
      return {
        specid: row.specid || sku || `${product.id}-sku-${index + 1}`,
        skuid: row.skuid || sku || `${product.id}-sku-${index + 1}`,
        props_names: label,
        sale_price: Number.isFinite(price) ? price : product.price,
        price: Number.isFinite(price) ? price : product.price,
        stock: Number.isFinite(stock) ? stock : product.stock_qty,
        imageUrl: row.image_url || row.imageUrl || coverImageUrl || undefined,
      };
    })
    .filter(Boolean);
}

function normalizeLocalProductProps(product: any) {
  const rows = Array.isArray(product.specifications) ? product.specifications : [];
  const props = rows
    .map((row: any, index: number) => {
      if (!row || typeof row !== 'object') return null;
      const label = String(row.label || row.name || row.option || row.title || `Option ${index + 1}`).trim();
      const valueParts = [
        row.sku ? `SKU ${row.sku}` : '',
        row.price !== undefined && row.price !== null && row.price !== '' ? `Price ${row.price}` : '',
        row.stock_qty !== undefined && row.stock_qty !== null && row.stock_qty !== '' ? `Stock ${row.stock_qty}` : '',
      ].filter(Boolean);
      return { [label]: valueParts.join(' · ') || '-' };
    })
    .filter(Boolean);

  if (product.weight_kg !== null && product.weight_kg !== undefined) {
    props.unshift({ 'Weight (kg)': product.weight_kg });
  }
  if (product.minimum_order_qty !== null && product.minimum_order_qty !== undefined) {
    props.unshift({ 'Minimum order qty': product.minimum_order_qty });
  }
  return props;
}

function buildLocalProductDetail(product: any, mediaById: Map<string, any> = new Map()) {
  const card = normalizeLocalProductCard(product, mediaById);
  const coverImageUrl = card.imageUrl || undefined;
  const galleryImages = Array.isArray(card.images) ? card.images.filter(Boolean) : [];
  const specs = normalizeLocalSkuRows(product, coverImageUrl);
  return {
    ...card,
    images: galleryImages.length ? galleryImages : card.imageUrl ? [card.imageUrl] : undefined,
    description: product.description || '',
    raw: product,
    rating: product.rating || undefined,
    ratingCount: product.review_count || undefined,
    availableQuantity: product.stock_qty || undefined,
    stock: product.stock_qty || undefined,
    estimatedWeightKg: product.weight_kg ?? undefined,
    weight_kg: product.weight_kg ?? undefined,
    skus: normalizeLocalSkuRows(product, coverImageUrl),
    productProps: specs,
    detailUrl: card.sourceUrl || undefined,
    shipping: {
      currency: product.currency || 'BDT',
      minimumOrderQty: product.minimum_order_qty || 1,
    },
  };
}

function buildCategoryTree(rows: any[]) {
  const nodes = rows.map((row) => ({
    ...row,
    children: [],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: any[] = [];
  for (const node of nodes) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (items: any[]) => items
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name)))
    .map((item) => ({
      ...item,
      children: sortNodes(item.children || []),
    }));
  return sortNodes(roots);
}

export default async function publicShoppingRoutes(fastify: FastifyInstance) {
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
  const recentSearchSource = shoppingProvider === 'shopping_otapi' ? 'shopping_otapi' : 'tmapi_1688';

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

        if (!data.mimetype || !data.mimetype.startsWith('image/')) {
          reply.status(400).send({ error: 'File must be an image' });
          return;
        }

        const buffer = await data.toBuffer();
        const sanitizedFilename = data.filename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image';
        const key = `shopping/search/${Date.now()}-${sanitizedFilename}`;

        await uploadToR2(key, buffer, data.mimetype);

        return {
          key,
          publicUrl: getPublicUrl(key),
        };
      } catch (error: any) {
        fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /shopping/upload-image error');
        reply.status(500).send({ error: error.message || 'Failed to upload image' });
      }
    }
  );

  fastify.get('/image-proxy', async (request: FastifyRequest, reply: FastifyReply) => {
    const { url: urlParam } = request.query as { url?: string };

    if (!urlParam) {
      reply.status(400).send({ error: 'Missing url parameter' });
      return;
    }

    try {
      const decodedUrl = decodeURIComponent(urlParam);
      let imageUrl: URL;

      try {
        imageUrl = new URL(decodedUrl);
      } catch (error) {
        reply.status(400).send({ error: 'Invalid URL' });
        return;
      }

      const allowedDomains = ['cbu01.alicdn.com', 'img.alicdn.com', 'detail.1688.com', 'alicdn.com', '1688.com'];
      const hostname = imageUrl.hostname.toLowerCase();
      const isAllowed = allowedDomains.some((domain) => {
        const normalized = domain.toLowerCase();
        return hostname === normalized || hostname.endsWith(`.${normalized}`) || hostname.includes(normalized);
      });

      if (!isAllowed) {
        reply.status(403).send({ error: `Domain not allowed: ${hostname}` });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(decodedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://detail.1688.com/',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        reply.status(response.status).send({ error: `Failed to fetch image: ${response.statusText}` });
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.send(buffer);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /image-proxy error');
      reply.status(500).send({ error: 'Failed to proxy image' });
    }
  });

  fastify.get('/shopping/categories', async () => {
    const categories = await prisma.productCategory.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return buildCategoryTree(categories);
  });

  fastify.get('/shopping/hot', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = getHotItemsSchema.parse(request.query);
      const page = parseInt((request.query as any).page || '1', 10);
      const pageSize = parseInt((request.query as any).pageSize || '20', 10);
      return getHotItems(query.category, page, pageSize);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, query: request.query }, '[Public Shopping Route] /shopping/hot error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = searchByKeywordSchema.parse(request.query);
      const localWhere: any = {
        status: 'published',
      };
      if (query.category) {
        localWhere.OR = [
          { category: { slug: query.category } },
          { category: { parent: { slug: query.category } } },
        ];
      }
      if (query.keyword) {
        localWhere.OR = [
          ...(localWhere.OR || []),
          { title: { contains: query.keyword, mode: 'insensitive' } },
          { description: { contains: query.keyword, mode: 'insensitive' } },
          { brand: { contains: query.keyword, mode: 'insensitive' } },
        ];
      }

      const [localProducts, otapiResults] = await Promise.all([
        prisma.product.findMany({
          where: localWhere,
          include: {
            coverAsset: true,
            seller: {
              include: { sellerProfile: true },
            },
            category: true,
          },
          orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
          take: query.pageSize || 20,
        }),
        searchByKeyword(query.keyword, {
          category: query.category,
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          language: query.language,
        }),
      ]);

      const localAssetIds = Array.from(new Set(localProducts.flatMap((product: any) => [
        ...(Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : []),
        product.cover_asset_id,
      ]).filter((id): id is string => typeof id === 'string' && id.length > 0)));
      const localAssets = localAssetIds.length > 0
        ? await prisma.mediaAsset.findMany({
            where: { id: { in: localAssetIds } },
            select: { id: true, public_url: true, thumbnail_url: true },
          })
        : [];
      const mediaById = new Map<string, any>(localAssets.map((asset) => [asset.id, asset]));
      const localCards = localProducts.map((product) => normalizeLocalProductCard(product, mediaById));
      const otapiCards = otapiResults.items || [];
      const merged = [...localCards, ...otapiCards];
      const pageSize = query.pageSize || 20;
      return {
        ...otapiResults,
        items: merged.slice(0, pageSize),
        localItems: localCards,
        otapiItems: otapiCards,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, query: request.query }, '[Public Shopping Route] /shopping/search error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/premium-products', async (request: FastifyRequest) => {
    const query = request.query as { category?: string; limit?: string };
    const limit = Math.max(1, Math.min(20, parseInt(query.limit || '4', 10)));
    const where: any = {
      status: 'published',
      source_kind: 'manual',
    };

    if (query.category) {
      where.category = { slug: query.category };
    }

    const items = await prisma.product.findMany({
      where,
      include: {
        coverAsset: true,
        seller: { include: { sellerProfile: true } },
        category: true,
      },
      orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
      take: limit,
    });

    const assetIds = Array.from(new Set(items.flatMap((product: any) => [
      ...(Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : []),
      product.cover_asset_id,
    ]).filter((id): id is string => typeof id === 'string' && id.length > 0)));
    const assets = assetIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, public_url: true, thumbnail_url: true },
        })
      : [];
    const mediaById = new Map<string, any>(assets.map((asset) => [asset.id, asset]));
    return items.map((product) => normalizeLocalProductCard(product, mediaById));
  });

  fastify.get('/shopping/settings', async () => {
      const [shippingRates, markupSetting, moqRule] = await Promise.all([
        prisma.shippingRateSetting.findMany({
          where: { is_active: true },
          orderBy: [{ method: 'asc' }, { currency: 'asc' }],
        }),
        prisma.sourceMarkupSetting.findUnique({
          where: { source_kind: 'shopping_otapi' },
        }),
        prisma.moqShoppingOtapiRule.findUnique({
          where: { scope: 'global' },
        }),
      ]);

      return {
        shippingRates,
        otapiMarkupPercent: markupSetting?.percent_rate ?? 0,
        defaultCurrency: 'BDT',
        moqRule: moqRule || null,
        shippingTimeText: '12-14 days',
      };
  });

  fastify.post('/shopping/search/image', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = searchByImageSchema.parse(request.body);
      return searchByImage(body.r2_public_url, {
        category: body.category,
        page: body.page,
        pageSize: body.pageSize,
        sort: body.sort,
        language: body.language || 'zh',
      });
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /shopping/search/image error');
      reply.status(400).send({ error: error.message || 'Invalid request body' });
    }
  });

  fastify.get('/shopping/item/:externalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { externalId } = request.params as { externalId: string };
    const query = request.query as { language?: string };
    const language = query.language === 'en' ? 'en' : 'zh';

    const localProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { id: externalId },
          { external_id: externalId },
        ],
        status: 'published',
      },
      include: {
        coverAsset: true,
        seller: {
          include: { sellerProfile: true },
        },
        category: true,
      },
    });

    if (localProduct) {
      const assetIds = Array.from(new Set([
        ...(Array.isArray(localProduct.gallery_asset_ids) ? localProduct.gallery_asset_ids : []),
        localProduct.cover_asset_id,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0)));
      const assets = assetIds.length > 0
        ? await prisma.mediaAsset.findMany({
            where: { id: { in: assetIds } },
            select: { id: true, public_url: true, thumbnail_url: true },
          })
        : [];
      const mediaById = new Map<string, any>(assets.map((asset) => [asset.id, asset]));
      return buildLocalProductDetail(localProduct, mediaById);
    }

    const item = await getItemDetail(externalId, language);
    if (!item) {
      reply.status(404).send({ error: 'Item not found' });
      return;
    }
    return item;
  });

  fastify.get('/shopping/recent-searches', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!shoppingDbAvailable) {
        return [];
      }
      const query = request.query as { limit?: string; language?: string };
      const limit = parseInt(query.limit || '8', 10);

      const recentSearches = await prisma.externalSearchCache.findMany({
        where: {
          source: recentSearchSource,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit * 3,
      });

      const keywords = new Map<string, Date>();

      for (const search of recentSearches) {
        try {
          const queryJson = search.query_json as any;
          let keyword: string | undefined;

          if (typeof queryJson === 'string') {
            try {
              const parsed = JSON.parse(queryJson);
              keyword = parsed.keyword || parsed.keywords;
            } catch {
              continue;
            }
          } else if (typeof queryJson === 'object' && queryJson !== null) {
            keyword = queryJson.keyword || queryJson.keywords;
          }

          if (keyword && typeof keyword === 'string' && keyword.trim()) {
            const normalized = keyword.trim().toLowerCase();
            if (!keywords.has(normalized) || (search.created_at && search.created_at > (keywords.get(normalized) || new Date(0)))) {
              keywords.set(normalized, search.created_at || new Date());
            }
          }
        } catch {
          continue;
        }
      }

      return Array.from(keywords.entries())
        .sort((a, b) => b[1].getTime() - a[1].getTime())
        .slice(0, limit)
        .map(([keyword]) => keyword);
    } catch (error: any) {
      if (isDatabaseUnavailable(error)) {
        shoppingDbAvailable = false;
        fastify.log.warn('[Public Shopping Route] Database unavailable for recent searches - returning empty list');
        return [];
      }
      fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /shopping/recent-searches error');
      reply.status(500).send({ error: error.message || 'Failed to get recent searches' });
    }
  });

  fastify.get('/offers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!shoppingDbAvailable) {
        return [];
      }
      const now = new Date();
      const offers = await prisma.homepageOffer.findMany({
        where: {
          is_active: true,
          OR: [
            { valid_from: null, valid_until: null },
            { valid_from: { lte: now }, valid_until: { gte: now } },
            { valid_from: { lte: now }, valid_until: null },
            { valid_from: null, valid_until: { gte: now } },
          ],
        },
        select: {
          id: true,
          offer_type: true,
          value: true,
          currency: true,
          title: true,
          subtitle: true,
          description: true,
          link: true,
          gallery_asset_ids: true,
          valid_from: true,
          valid_until: true,
          coverAsset: {
            select: {
              id: true,
              public_url: true,
              thumbnail_url: true,
              width: true,
              height: true,
            },
          },
        },
        orderBy: [
          { valid_from: 'asc' },
          { updated_at: 'desc' },
        ],
        take: 10,
      });
      return offers;
    } catch (error: any) {
      if (isDatabaseUnavailable(error)) {
        shoppingDbAvailable = false;
        fastify.log.warn('[Offers] Database connection unavailable - returning empty array');
        return [];
      }
      fastify.log.error({ error, stack: error.stack }, '[Offers] Database error');
      return [];
    }
  });
}
