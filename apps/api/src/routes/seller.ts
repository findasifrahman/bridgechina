import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const auth = [async (request: FastifyRequest, reply: FastifyReply) => {
  const fastify = request.server as FastifyInstance & { authenticate?: any };
  if (!fastify.authenticate) {
    reply.status(500).send({ error: 'Authentication not configured' });
    return;
  }
  await fastify.authenticate(request, reply);
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const req = request as any;
  if (!req.user?.roles?.includes('SELLER') && !req.user?.roles?.includes('ADMIN')) {
    reply.status(403).send({ error: 'Forbidden' });
  }
}];

const slugifySku = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

async function generateUniqueProductSku(preferredSku: string | null | undefined, title: string) {
  const base = slugifySku(preferredSku?.trim() || title || 'product') || 'product';
  let candidate = base;
  let attempt = 0;

  while (await prisma.product.findFirst({ where: { sku: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  if (!candidate || candidate.length < 3) {
    return `prod-${randomUUID().slice(0, 8)}`;
  }

  return candidate;
}

export default async function sellerRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const [items, approved, rejected, pendingProofs, weeklySales, monthlySales] = await Promise.all([
      prisma.orderItem.count({ where: { seller_id: req.user.id } }),
      prisma.orderItem.count({ where: { seller_id: req.user.id, seller_status: 'approved' } }),
      prisma.orderItem.count({ where: { seller_id: req.user.id, seller_status: 'rejected' } }),
      prisma.paymentProof.count({
        where: {
          status: 'submitted',
          order: {
            items: {
              some: {
                seller_id: req.user.id,
              },
            },
          },
        },
      }),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('week', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${req.user.id} AND o.created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('month', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${req.user.id} AND o.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
    ]);

    return { items, approved, rejected, pendingProofs, weeklySales, monthlySales };
  });

  fastify.get('/potential-leads', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const searchPattern = search ? `%${search}%` : null;

    const searchSql = searchPattern
      ? Prisma.sql`
          AND (
            u.email ILIKE ${searchPattern}
            OR u.phone ILIKE ${searchPattern}
            OR cp.full_name ILIKE ${searchPattern}
            OR ci.title_snapshot ILIKE ${searchPattern}
          )
        `
      : Prisma.empty;

    const baseSql = Prisma.sql`
      WITH aggregated AS (
        SELECT
          c.id AS cart_id,
          u.id AS user_id,
          u.email,
          u.phone,
          cp.full_name,
          MIN(ci.created_at) AS first_cart_item_at,
          MAX(ci.created_at) AS last_cart_item_at,
          COUNT(ci.id)::int AS item_count,
          COALESCE(SUM(ci.qty), 0)::int AS total_qty,
          COALESCE(SUM(ci.qty * ci.price_snapshot), 0)::float AS cart_value,
          COALESCE(MAX(ci.currency_snapshot), 'BDT') AS currency,
          jsonb_agg(
            jsonb_build_object(
              'id', ci.id,
              'title', COALESCE(ci.title_snapshot, p.title),
              'qty', ci.qty,
              'price', ci.price_snapshot,
              'currency', ci.currency_snapshot,
              'imageUrl', COALESCE(ci.image_url_snapshot, ma.public_url),
              'createdAt', ci.created_at
            )
            ORDER BY ci.created_at DESC
          ) AS items
        FROM carts c
        JOIN users u ON u.id = c.user_id
        JOIN cart_items ci ON ci.cart_id = c.id
        LEFT JOIN products p ON p.id = ci.product_id
        LEFT JOIN media_assets ma ON ma.id = p.cover_asset_id
        LEFT JOIN customer_profiles cp ON cp.user_id = u.id
        WHERE ci.seller_id = ${req.user.id}
          AND ci.created_at >= NOW() - INTERVAL '1 month'
        ${searchSql}
        GROUP BY c.id, u.id, u.email, u.phone, cp.full_name
      ),
      leads AS (
        SELECT *
        FROM aggregated a
        WHERE NOT EXISTS (
          SELECT 1
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          WHERE o.user_id = a.user_id
            AND oi.seller_id = ${req.user.id}
            AND o.created_at >= a.first_cart_item_at
        )
      )
    `;

    const [countRows, leads] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`
        ${baseSql}
        SELECT COUNT(*)::int AS total FROM leads
      `) as Promise<Array<{ total: number }>>,
      prisma.$queryRaw(Prisma.sql`
        ${baseSql}
        SELECT *
        FROM leads
        ORDER BY last_cart_item_at DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `) as Promise<any[]>,
    ]);

    const total = countRows[0]?.total || 0;
    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/orders', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const query = request.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();

    const where: any = { seller_id: req.user.id };
    if (query.status && query.status !== 'all') {
      where.seller_status = query.status;
    }
    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) where.created_at.gte = new Date(query.from);
      if (query.to) where.created_at.lte = new Date(query.to);
    }
    if (search) {
      where.OR = [
        { order: { order_number: { contains: search, mode: 'insensitive' } } },
        { order: { user: { email: { contains: search, mode: 'insensitive' } } } },
        { order: { user: { phone: { contains: search, mode: 'insensitive' } } } },
        { title_snapshot: { contains: search, mode: 'insensitive' } },
        { product: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.orderItem.count({ where }),
      prisma.orderItem.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                include: {
                  customerProfile: true,
                },
              },
              shippingAddress: true,
              paymentProofs: {
                include: {
                  asset: true,
                  reviewer: true,
                },
              },
              items: {
                where: { seller_id: req.user.id },
                include: {
                  product: {
                    include: {
                      coverAsset: true,
                      category: true,
                    },
                  },
                },
              },
              statusEvents: true,
            },
          },
          product: {
            include: {
              coverAsset: true,
              category: true,
            },
          },
          seller: {
            include: { sellerProfile: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.patch('/order-items/:id/review', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['approved', 'rejected']),
      note: z.string().optional(),
    }).parse(request.body);

    const item = await prisma.orderItem.findUnique({ where: { id } });
    if (!item || item.seller_id !== req.user.id) {
      return reply.status(404).send({ error: 'Order item not found' });
    }

    const updated = await prisma.orderItem.update({
      where: { id },
      data: {
        seller_status: body.status,
        seller_note: body.note || null,
        reviewed_at: new Date(),
      },
    });

    if (body.status === 'approved') {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: item.order_id },
          include: { items: true },
        });
        if (!order) return;

        const nextStatus = order.status === 'pending_payment' || order.status === 'pending_review'
          ? 'pending_purchase'
          : order.status;

        if (nextStatus !== order.status) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
            },
          });
        }

        if (nextStatus !== order.status) {
          await tx.orderStatusEvent.create({
            data: {
              order_id: order.id,
              status_from: order.status,
              status_to: nextStatus,
              note: 'Seller approved review queue',
              created_by: req.user.id,
            },
          });
        }
      });
    }

    return updated;
  });

  fastify.patch('/orders/:id/archive', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    return prisma.order.update({
      where: { id },
      data: { seller_archived_at: new Date() },
    });
  });

  fastify.patch('/customers/:id/review', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      rating: z.number().int().min(1).max(10).optional(),
      note: z.string().optional(),
    }).parse(request.body);

    const customer = await prisma.user.findUnique({ where: { id } });
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    await prisma.customerProfile.upsert({
      where: { user_id: id },
      update: {
        internal_rating: body.rating ?? undefined,
        internal_note: body.note ?? undefined,
        internal_note_updated_by: req.user.id,
        internal_note_updated_at: new Date(),
      },
      create: {
        user_id: id,
        internal_rating: body.rating ?? null,
        internal_note: body.note ?? null,
        internal_note_updated_by: req.user.id,
        internal_note_updated_at: new Date(),
      },
    });

    return prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true },
    });
  });

  fastify.get('/products', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    return prisma.product.findMany({
      where: { seller_id: req.user.id },
      include: {
        category: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/products', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      category_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      currency: z.string().optional(),
      stock_qty: z.number().int().min(0).optional(),
      sku: z.string().optional(),
      brand: z.string().optional(),
      source_url: z.string().optional(),
      external_id: z.string().optional(),
      weight_kg: z.number().optional(),
    }).parse(request.body);

    const sku = await generateUniqueProductSku(body.sku, body.title);

    const product = await prisma.product.create({
      data: {
        seller_id: req.user.id,
        category_id: body.category_id,
        title: body.title,
        description: body.description || null,
        price: body.price,
        currency: body.currency || 'BDT',
        stock_qty: body.stock_qty ?? 0,
        sku,
        brand: body.brand || null,
        source_kind: 'manual',
        source_url: body.source_url || null,
        external_id: body.external_id || null,
        weight_kg: body.weight_kg ?? null,
        status: 'published',
      },
    });

    return reply.status(201).send(product);
  });

  fastify.patch('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.seller_id !== req.user.id) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    return prisma.product.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        price: body.price ?? undefined,
        currency: body.currency ?? undefined,
        stock_qty: body.stock_qty ?? undefined,
        status: body.status ?? undefined,
        brand: body.brand ?? undefined,
        source_url: body.source_url ?? undefined,
        external_id: body.external_id ?? undefined,
        sku: body.sku ?? undefined,
        weight_kg: body.weight_kg ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
      },
    });
  });

  fastify.delete('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.seller_id !== req.user.id) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  });
}
