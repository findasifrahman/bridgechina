import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createProductSchema, updateProductSchema } from '@bridgechina/shared';

export default async function sellerRoutes(fastify: FastifyInstance) {
  // All seller routes require authentication and SELLER role
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('SELLER'));

  // Dashboard stats
  fastify.get('/dashboard', async (request: FastifyRequest) => {
    const req = request as any;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [productsCount, ordersCount, totalRevenue] = await Promise.all([
      prisma.product.count({
        where: {
          seller_id: req.user.id,
          status: 'active',
        },
      }),
      prisma.orderItem.count({
        where: {
          seller_id: req.user.id,
          order: {
            created_at: { gte: today },
          },
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          seller_id: req.user.id,
          order: {
            status: { in: ['paid', 'processing', 'shipped', 'delivered'] },
          },
        },
        _sum: {
          price_snapshot: true,
        },
      }),
    ]);

    return {
      products: productsCount,
      ordersToday: ordersCount,
      totalRevenue: totalRevenue._sum.price_snapshot || 0,
    };
  });

  // Products CRUD
  fastify.get('/products', async (request: FastifyRequest) => {
    const req = request as any;
    const { status } = request.query as { status?: string };

    const products = await prisma.product.findMany({
      where: {
        seller_id: req.user.id,
        ...(status ? { status } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return products;
  });

  fastify.get('/products/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const req = request as any;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product || product.seller_id !== req.user.id) {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }

    return product;
  });

  fastify.post('/products', async (request: FastifyRequest) => {
    const body = createProductSchema.parse(request.body);
    const req = request as any;

    const product = await prisma.product.create({
      data: {
        seller_id: req.user.id,
        category_id: body.category_id,
        title: body.title,
        description: body.description || null,
        price: body.price,
        currency: body.currency || 'CNY',
        stock_qty: body.stock_qty || 0,
        status: body.status || 'draft',
        gallery_asset_ids: body.images ? (body.images as any) : null,
      },
    });

    return product;
  });

  fastify.patch('/products/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateProductSchema.parse(request.body);
    const req = request as any;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.seller_id !== req.user.id) {
      reply.status(404).send({ error: 'Product not found' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: body,
    });

    return updated;
  });

  // Orders (only seller's products)
  fastify.get('/orders', async (request: FastifyRequest) => {
    const req = request as any;

    const orderItems = await prisma.orderItem.findMany({
      where: {
        seller_id: req.user.id,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            shippingAddress: true,
          },
        },
        product: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Group by order
    const ordersMap = new Map();
    orderItems.forEach((item) => {
      const orderId = item.order_id;
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          ...item.order,
          items: [],
        });
      }
      ordersMap.get(orderId).items.push(item);
    });

    return Array.from(ordersMap.values());
  });

  // Media upload (R2 presigned URL)
  fastify.post('/media/presigned-url', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { filename: string; mimeType: string };

    try {
      const { generatePresignedPutUrl } = await import('../utils/r2.js');
      const key = `uploads/${Date.now()}-${body.filename}`;
      const { uploadUrl, key: finalKey } = await generatePresignedPutUrl(
        key,
        body.mimeType,
        3600 // 1 hour expiry
      );

      return {
        uploadUrl,
        key: finalKey,
        publicUrl: `${process.env.R2_PUBLIC_BASE_URL || ''}/${finalKey}`,
      };
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to generate presigned URL' });
    }
  });
}

