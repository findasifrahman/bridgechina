import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { deleteFromR2, getPublicUrl, uploadToR2 } from '../utils/r2.js';
import { z } from 'zod';

const auth = [async (request: FastifyRequest, reply: FastifyReply) => {
  const fastify = request.server as FastifyInstance & { authenticate?: any };
  if (!fastify.authenticate) {
    reply.status(500).send({ error: 'Authentication not configured' });
    return;
  }
  await fastify.authenticate(request, reply);
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const req = request as any;
  if (!req.user?.roles?.includes('ADMIN')) {
    reply.status(403).send({ error: 'Forbidden' });
  }
}];

const mediaUploadSchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(),
});

const parseList = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const parseJsonMaybe = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return value;
};

const parseStringArray = (value: unknown) => parseList(value).filter(Boolean);

const normalizeSpecifications = (value: unknown) => {
  const parsed = parseJsonMaybe(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  return [parsed];
};

function buildCategoryTree(rows: any[]) {
  const nodes = rows.map((row) => ({ ...row, children: [] as any[] }));
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
    .map((item) => ({ ...item, children: sortNodes(item.children || []) }));
  return sortNodes(roots);
}

async function getDefaultSellerAndCategory() {
  const [seller, category] = await Promise.all([
    prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: { name: 'SELLER' },
          },
        },
      },
    }),
    prisma.productCategory.findFirst({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return { seller, category };
}

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: auth }, async () => {
    const [users, products, orders, pendingProofs, pendingSellerItems, approvedSellerItems, recentOrders, weeklySales, monthlySales] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.paymentProof.count({ where: { status: 'submitted' } }),
      prisma.orderItem.count({ where: { seller_status: 'pending_review' } }),
      prisma.orderItem.count({ where: { seller_status: 'approved' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            include: {
              customerProfile: true,
            },
          },
          items: {
            include: {
              product: true,
              seller: {
                include: { sellerProfile: true },
              },
            },
          },
          shippingAddress: true,
          paymentProofs: true,
        },
      }),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('week', created_at) AS period, COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('month', created_at) AS period, COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
    ]);

    return {
      users,
      products,
      orders,
      pendingProofs,
      pendingSellerItems,
      approvedSellerItems,
      recentOrders,
      weeklySales,
      monthlySales,
    };
  });

  fastify.get('/orders', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      status?: string;
      payment_status?: string;
      search?: string;
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
      pending_first?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();
    const pendingFirst = query.pending_first !== '0';

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.payment_status) where.payment_status = query.payment_status;
    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) where.created_at.gte = new Date(query.from);
      if (query.to) where.created_at.lte = new Date(query.to);
    }
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { name: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { city: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
              seller: {
                include: { sellerProfile: true },
              },
            },
          },
          shippingAddress: true,
          shippingUpdates: true,
          statusEvents: true,
          paymentProofs: {
            include: {
              asset: true,
              reviewer: true,
            },
          },
          user: {
            include: {
              customerProfile: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const sortedOrders = pendingFirst
      ? [...orders].sort((a, b) => {
          const aPending = a.items?.some((item: any) => item.seller_status === 'pending_review') ? 1 : 0;
          const bPending = b.items?.some((item: any) => item.seller_status === 'pending_review') ? 1 : 0;
          if (aPending !== bPending) return aPending - bPending;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      : orders;

    return {
      orders: sortedOrders,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.patch('/orders/:id/status', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['pending_purchase', 'purchased', 'in_warehouse', 'shipped', 'received', 'cancelled']),
      note: z.string().optional(),
    }).parse(request.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status },
    });

    await prisma.orderStatusEvent.create({
      data: {
        order_id: id,
        status_from: order.status,
        status_to: body.status,
        note: body.note || null,
        created_by: req.user.id,
      },
    });

    return updated;
  });

  fastify.get('/payment-proofs', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as { status?: string };
    return prisma.paymentProof.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: true,
                seller: {
                  include: { sellerProfile: true },
                },
              },
            },
          },
        },
        asset: true,
        reviewer: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.patch('/payment-proofs/:id/approve', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      note: z.string().optional(),
    }).parse(request.body);

    const proof = await prisma.paymentProof.findUnique({ where: { id } });
    if (!proof) {
      return reply.status(404).send({ error: 'Payment proof not found' });
    }

    return prisma.$transaction(async (tx) => {
      const updatedProof = await tx.paymentProof.update({
        where: { id },
        data: {
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: new Date(),
          notes: body.note || proof.notes,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: proof.order_id },
        include: { items: true },
      });

      if (order) {
        const nextStatus = order.status === 'pending_payment' || order.status === 'pending_review'
          ? 'pending_purchase'
          : order.status;
        if (nextStatus !== order.status) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              payment_status: 'approved',
            },
          });
          await tx.orderStatusEvent.create({
            data: {
              order_id: order.id,
              status_from: order.status,
              status_to: nextStatus,
              note: 'Payment proof approved',
              created_by: req.user.id,
            },
          });
        } else if (order.payment_status !== 'approved') {
          await tx.order.update({
            where: { id: order.id },
            data: { payment_status: 'approved' },
          });
        }
      }

      return updatedProof;
    });
  });

  fastify.patch('/payment-proofs/:id/reject', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      note: z.string().optional(),
    }).parse(request.body);

    const proof = await prisma.paymentProof.findUnique({ where: { id } });
    if (!proof) {
      return reply.status(404).send({ error: 'Payment proof not found' });
    }
    if (proof.status === 'approved') {
      return reply.status(409).send({ error: 'Approved payment proof cannot be rejected' });
    }

    return prisma.paymentProof.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        notes: body.note || proof.notes,
      },
    });
  });

  fastify.get('/products', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      category_id?: string;
      seller_id?: string;
      status?: string;
      source_kind?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const search = query.search?.trim();
    const categoryId = query.category_id?.trim();
    const sellerId = query.seller_id?.trim();
    const status = query.status?.trim();
    const sourceKind = query.source_kind?.trim();

    const where: any = {};
    if (categoryId) {
      where.category_id = categoryId;
    }
    if (sellerId) {
      where.seller_id = sellerId;
    }
    if (status) {
      where.status = status;
    }
    if (sourceKind) {
      where.source_kind = sourceKind;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { external_id: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { source_url: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          seller: {
            include: { sellerProfile: true },
          },
          coverAsset: true,
        },
        orderBy: [{ created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      products,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  });

  fastify.post('/products', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      category_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      currency: z.string().optional(),
      stock_qty: z.number().int().min(0).optional(),
      minimum_order_qty: z.number().int().min(1).optional(),
      sku: z.string().optional(),
      seller_name: z.string().optional(),
      brand: z.string().optional(),
      source_kind: z.string().optional(),
      source_url: z.string().optional(),
      external_id: z.string().optional(),
      weight_kg: z.number().optional(),
      cover_asset_id: z.string().optional(),
      gallery_asset_ids: z.any().optional(),
      specifications: z.any().optional(),
    }).parse(request.body);
    const req = request as any;

    const product = await prisma.product.create({
      data: {
        seller_id: req.user.id,
        category_id: body.category_id,
        title: body.title,
        description: body.description || null,
        price: body.price,
        currency: body.currency || 'BDT',
        stock_qty: body.stock_qty ?? 0,
        minimum_order_qty: body.minimum_order_qty ?? 1,
        sku: body.sku || null,
        brand: body.seller_name || body.brand || null,
        source_kind: body.source_kind || 'manual',
        source_url: body.source_url || null,
        external_id: body.external_id || null,
        weight_kg: body.weight_kg ?? null,
        cover_asset_id: body.cover_asset_id || null,
        gallery_asset_ids: parseStringArray(body.gallery_asset_ids),
        specifications: normalizeSpecifications(body.specifications),
        status: 'published',
      },
    });

    return reply.status(201).send(product);
  });

  fastify.patch('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
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
        minimum_order_qty: body.minimum_order_qty ?? undefined,
        status: body.status ?? undefined,
        brand: body.seller_name ?? body.brand ?? undefined,
        source_kind: body.source_kind ?? undefined,
        source_url: body.source_url ?? undefined,
        external_id: body.external_id ?? undefined,
        sku: body.sku ?? undefined,
        weight_kg: body.weight_kg ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        category_id: body.category_id ?? undefined,
        gallery_asset_ids: body.gallery_asset_ids !== undefined ? parseStringArray(body.gallery_asset_ids) : undefined,
        specifications: body.specifications !== undefined ? normalizeSpecifications(body.specifications) : undefined,
      },
    });
  });

  fastify.delete('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  });

  fastify.get('/users', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      role?: string;
      status?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();
    const role = query.role?.trim().toUpperCase();
    const status = query.status?.trim().toLowerCase();

    const where: any = {};
    if (role === 'CUSTOMER' || role === 'SELLER' || role === 'ADMIN') {
      where.roles = {
        some: {
          role: { name: role },
        },
      };
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerProfile: { full_name: { contains: search, mode: 'insensitive' } } },
        { sellerProfile: { shop_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'active' || status === 'blocked') {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          roles: { include: { role: true } },
          customerProfile: true,
          sellerProfile: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/customers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        customerProfile: {
          include: {
            avatarAsset: true,
            internalNoteUpdatedBy: true,
          },
        },
        addresses: {
          orderBy: { created_at: 'desc' },
        },
        orders: {
          orderBy: { created_at: 'desc' },
          take: 20,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            shippingAddress: true,
          },
        },
      },
    });

    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    return customer;
  });

  fastify.patch('/customers/:id/review', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      rating: z.number().int().min(1).max(10).optional(),
      note: z.string().optional(),
    }).parse(request.body);

    const customer = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true },
    });

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
      include: {
        customerProfile: true,
      },
    });
  });

  fastify.delete('/users/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const roleNames = user.roles.map((entry) => entry.role.name);
    if (!roleNames.includes('CUSTOMER')) {
      return reply.status(400).send({ error: 'Only customer users can be deleted from this screen' });
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'Customer deleted' };
  });

  fastify.get('/sellers', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();

    const where: any = {
      roles: {
        some: {
          role: {
            name: 'SELLER',
          },
        },
      },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { sellerProfile: { shop_name: { contains: search, mode: 'insensitive' } } },
        { sellerProfile: { display_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, sellers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          roles: { include: { role: true } },
          sellerProfile: true,
          products: true,
          sellerOrderItems: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      sellers,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/sellers/:id/report', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      from?: string;
      to?: string;
    };

    const seller = await prisma.user.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
      },
    });
    if (!seller) {
      return reply.status(404).send({ error: 'Seller not found' });
    }

    const dateWhere: any = { seller_id: id };
    if (query.from || query.to) {
      dateWhere.created_at = {};
      if (query.from) dateWhere.created_at.gte = new Date(query.from);
      if (query.to) dateWhere.created_at.lte = new Date(query.to);
    }

    const [items, weeklySales, monthlySales] = await Promise.all([
      prisma.orderItem.findMany({
        where: dateWhere,
        include: {
          order: {
            include: {
              user: {
                include: { customerProfile: true },
              },
              shippingAddress: true,
              paymentProofs: {
                include: { asset: true },
              },
            },
          },
          product: {
            include: { category: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('week', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${id} AND o.created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('month', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${id} AND o.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
    ]);

    return {
      seller,
      items,
      weeklySales,
      monthlySales,
    };
  });

  fastify.patch('/users/:id/roles', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const rawBody = request.body as any;
    const body = z.object({
      roles: z.array(z.string().min(1)).min(1).optional(),
      role_ids: z.array(z.string().min(1)).min(1).optional(),
    }).parse(rawBody);
    const roleNames = body.roles || body.role_ids || [];

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.userRole.deleteMany({ where: { user_id: id } });
    for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
      await prisma.userRole.create({
        data: {
          user_id: id,
          role_id: role.id,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    });
  });

  fastify.put('/users/:id/roles', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rawBody = request.body as any;
    const body = z.object({
      roles: z.array(z.string().min(1)).min(1).optional(),
      role_ids: z.array(z.string().min(1)).min(1).optional(),
    }).parse(rawBody);
    const roleNames = body.roles || body.role_ids || [];

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.userRole.deleteMany({ where: { user_id: id } });
    for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
      await prisma.userRole.create({
        data: {
          user_id: id,
          role_id: role.id,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    });
  });

  fastify.get('/categories', { preHandler: auth }, async () => {
    return prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.get('/categories/tree', { preHandler: auth }, async () => {
    const categories = await prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return buildCategoryTree(categories);
  });

  fastify.get('/service-categories', { preHandler: auth }, async () => {
    return prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.post('/categories', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      parent_id: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    const category = await prisma.productCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        parent_id: body.parent_id || null,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });

    return reply.status(201).send(category);
  });

  fastify.patch('/categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    return prisma.productCategory.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        parent_id: body.parent_id ?? undefined,
        description: body.description ?? undefined,
        icon: body.icon ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
      },
    });
  });

  fastify.delete('/categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    await prisma.productCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  });

  fastify.get('/profit-markup', { preHandler: auth }, async () => {
    return prisma.sourceMarkupSetting.findUnique({
      where: { source_kind: 'shopping_otapi' },
    });
  });

  fastify.get('/moq-rule', { preHandler: auth }, async () => {
    return prisma.moqShoppingOtapiRule.findUnique({
      where: { scope: 'global' },
    });
  });

  fastify.put('/moq-rule', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const body = z.object({
      minimum_product: z.number().int().min(1),
      minimum_price_threshold: z.number().min(0),
      currency: z.string().min(1).default('BDT'),
    }).parse(request.body);

    return prisma.moqShoppingOtapiRule.upsert({
      where: { scope: 'global' },
      update: {
        minimum_product: body.minimum_product,
        minimum_price_threshold: body.minimum_price_threshold,
        currency: body.currency,
        updated_by: req.user.id,
      },
      create: {
        scope: 'global',
        minimum_product: body.minimum_product,
        minimum_price_threshold: body.minimum_price_threshold,
        currency: body.currency,
        updated_by: req.user.id,
      },
    });
  });

  fastify.get('/shipping-rates', { preHandler: auth }, async () => {
    return prisma.shippingRateSetting.findMany({
      orderBy: [{ method: 'asc' }, { currency: 'asc' }],
    });
  });

  fastify.put('/shipping-rates/:method', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const { method } = request.params as { method: string };
    const body = z.object({
      currency: z.string().min(1).default('BDT'),
      min_rate_per_kg: z.number().min(0),
      max_rate_per_kg: z.number().min(0),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    return prisma.shippingRateSetting.upsert({
      where: {
        method_currency: {
          method,
          currency: body.currency,
        },
      },
      update: {
        min_rate_per_kg: body.min_rate_per_kg,
        max_rate_per_kg: body.max_rate_per_kg,
        is_active: body.is_active ?? true,
        updated_by: req.user.id,
      },
      create: {
        method,
        currency: body.currency,
        min_rate_per_kg: body.min_rate_per_kg,
        max_rate_per_kg: body.max_rate_per_kg,
        is_active: body.is_active ?? true,
        updated_by: req.user.id,
      },
    });
  });

  fastify.put('/profit-markup', { preHandler: auth }, async (request: FastifyRequest) => {
    const req = request as any;
    const body = z.object({
      percent_rate: z.number().min(0),
    }).parse(request.body);

    return prisma.sourceMarkupSetting.upsert({
      where: { source_kind: 'shopping_otapi' },
      update: {
        percent_rate: body.percent_rate,
        updated_by: req.user.id,
      },
      create: {
        source_kind: 'shopping_otapi',
        percent_rate: body.percent_rate,
        updated_by: req.user.id,
      },
    });
  });

  fastify.get('/blog-posts', { preHandler: auth }, async () => {
    return prisma.blogPost.findMany({
      include: {
        author: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/blog-posts', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      excerpt: z.string().optional(),
      content_md: z.string().min(1),
      cover_asset_id: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.body);

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || null,
        content_md: body.content_md,
        cover_asset_id: body.cover_asset_id || null,
        status: body.status || 'draft',
        created_by: req.user.id,
      },
    });

    return reply.status(201).send(post);
  });

  fastify.get('/homepage/offers', { preHandler: auth }, async () => {
    return prisma.homepageOffer.findMany({
      include: {
        coverAsset: true,
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  });

  fastify.post('/homepage/offers', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      offer_type: z.string().optional(),
      value: z.number().optional(),
      currency: z.string().optional(),
      link: z.string().optional(),
      cover_asset_id: z.string().optional(),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional(),
      valid_from: z.string().optional(),
      valid_until: z.string().optional(),
    }).parse(request.body);

    const offer = await prisma.homepageOffer.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,
        offer_type: body.offer_type || 'promotion',
        value: body.value ?? null,
        currency: body.currency || 'BDT',
        link: body.link || null,
        cover_asset_id: body.cover_asset_id || null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
        valid_from: body.valid_from ? new Date(body.valid_from) : null,
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
      },
      include: {
        coverAsset: true,
      },
    });

    return reply.status(201).send(offer);
  });

  fastify.put('/homepage/offers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageOffer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage offer not found' });
    }

    const body = request.body as any;
    return prisma.homepageOffer.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        description: body.description ?? undefined,
        offer_type: body.offer_type ?? undefined,
        value: body.value !== undefined ? Number(body.value) : undefined,
        currency: body.currency ?? undefined,
        link: body.link ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        is_active: body.is_active ?? undefined,
        sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
        valid_from: body.valid_from !== undefined ? (body.valid_from ? new Date(body.valid_from) : null) : undefined,
        valid_until: body.valid_until !== undefined ? (body.valid_until ? new Date(body.valid_until) : null) : undefined,
      },
      include: {
        coverAsset: true,
      },
    });
  });

  fastify.delete('/homepage/offers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageOffer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage offer not found' });
    }

    await prisma.homepageOffer.delete({ where: { id } });
    return { message: 'Homepage offer deleted' };
  });

  fastify.get('/roles', { preHandler: auth }, async () => {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  });

  fastify.get('/blog', { preHandler: auth }, async () => {
    return prisma.blogPost.findMany({
      include: {
        author: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/blog', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      excerpt: z.string().optional(),
      content_md: z.string().min(1),
      cover_asset_id: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.body);

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || null,
        content_md: body.content_md,
        cover_asset_id: body.cover_asset_id || null,
        status: body.status || 'draft',
        created_by: req.user.id,
      },
    });

    return reply.status(201).send(post);
  });

  fastify.patch('/blog/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ error: 'Blog post not found' });
    }

    return prisma.blogPost.update({
      where: { id },
      data: {
        slug: body.slug ?? undefined,
        title: body.title ?? undefined,
        excerpt: body.excerpt ?? undefined,
        content_md: body.content_md ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        status: body.status ?? undefined,
      },
    });
  });

  fastify.delete('/blog/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ error: 'Blog post not found' });
    }

    await prisma.blogPost.delete({ where: { id } });
    return { message: 'Blog post deleted' };
  });

  fastify.get('/homepage-banners', { preHandler: auth }, async () => {
    return prisma.homepageBanner.findMany({
      include: { coverAsset: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  });

  fastify.post('/homepage-banners', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      link: z.string().optional(),
      cta_text: z.string().optional(),
      cover_asset_id: z.string().optional(),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    }).parse(request.body);

    const banner = await prisma.homepageBanner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        link: body.link || null,
        cta_text: body.cta_text || 'Learn More',
        cover_asset_id: body.cover_asset_id || null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      },
    });

    return reply.status(201).send(banner);
  });

  fastify.put('/homepage-banners/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const banner = await prisma.homepageBanner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({ error: 'Homepage banner not found' });
    }

    return prisma.homepageBanner.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        link: body.link ?? undefined,
        cta_text: body.cta_text ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        is_active: body.is_active ?? undefined,
        sort_order: body.sort_order ?? undefined,
      },
    });
  });

  fastify.delete('/homepage-banners/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const banner = await prisma.homepageBanner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({ error: 'Homepage banner not found' });
    }

    await prisma.homepageBanner.delete({ where: { id } });
    return { message: 'Homepage banner deleted' };
  });

  fastify.get('/media', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as { page?: string; limit?: string; search?: string; category?: string };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '24', 10)));
    const search = query.search?.trim();
    const category = query.category?.trim();

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { r2_key: { contains: search, mode: 'insensitive' } },
        { public_url: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, media] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mediaWithTitles = media.map((item) => {
      const titleTag = Array.isArray(item.tags)
        ? item.tags.find((tag): tag is string => typeof tag === 'string' && tag.startsWith('title:'))
        : null;
      return {
        ...item,
        title: titleTag ? titleTag.replace('title:', '') : undefined,
      };
    });

    return {
      media: mediaWithTitles,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  });

  fastify.get('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    const titleTag = Array.isArray(item.tags)
      ? item.tags.find((tag): tag is string => typeof tag === 'string' && tag.startsWith('title:'))
      : null;

    return {
      ...item,
      title: titleTag ? titleTag.replace('title:', '') : undefined,
    };
  });

  fastify.post('/media/upload', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;

    try {
      fastify.log.info({
        userId: req.user?.id,
        contentType: request.headers['content-type'],
      }, '[Admin Route] /media/upload started');

      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
        return reply.status(500).send({ error: 'R2 not configured' });
      }

      const parts = request.parts();
      let fileData: any = null;
      let fileBuffer: Buffer | null = null;
      const meta: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          fileData = part;
          fastify.log.info({
            filename: part.filename,
            mimetype: part.mimetype,
          }, '[Admin Route] /media/upload file part received');
          fastify.log.info('[Admin Route] /media/upload buffering file data');
          const chunks: Buffer[] = [];
          for await (const chunk of part.file as AsyncIterable<Buffer | string>) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          fileBuffer = Buffer.concat(chunks);
          fastify.log.info({
            size: fileBuffer.length,
          }, '[Admin Route] /media/upload file buffered');
        } else if (part.type === 'field') {
          meta[String(part.fieldname)] = String(part.value);
        }
      }

      if (!fileData) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: 'No file provided' });
      }
      const maxSize = 10 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return reply.status(400).send({ error: 'File size exceeds 10MB' });
      }

      const timestamp = Date.now();
      const sanitizedFilename = String(fileData.filename || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;
      fastify.log.info({
        key,
        size: fileBuffer.length,
      }, '[Admin Route] /media/upload uploading to R2');
      await uploadToR2(key, fileBuffer, fileData.mimetype);
      const publicUrl = getPublicUrl(key);

      const tags = parseList(meta.tags);
      if (meta.title) {
        tags.unshift(`title:${meta.title}`);
      }

      const asset = await prisma.mediaAsset.create({
        data: {
          r2_key: key,
          public_url: publicUrl,
          mime_type: fileData.mimetype,
          size: fileBuffer.length,
          category: meta.category || 'admin',
          tags,
          uploaded_by: req.user.id,
        },
      });

      fastify.log.info({
        id: asset.id,
        key,
      }, '[Admin Route] /media/upload completed');

      return {
        ...asset,
        title: meta.title || undefined,
      };
    } catch (error: any) {
      fastify.log.error({
        message: error?.message,
        stack: error?.stack,
      }, '[Admin Route] /media/upload error');
      return reply.status(500).send({ error: error.message || 'Failed to upload media' });
    }
  });

  fastify.put('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const item = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    const existingTags = Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string' && !tag.startsWith('title:')) : [];
    const nextTags = Array.isArray(body.tags)
      ? body.tags
      : body.tagsText
        ? parseList(body.tagsText)
        : existingTags;
    if (body.title) {
      nextTags.unshift(`title:${body.title}`);
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        category: body.category ?? undefined,
        tags: nextTags,
      },
    } as any);

    return {
      ...updated,
      title: body.title || (Array.isArray(updated.tags) ? updated.tags.find((tag) => typeof tag === 'string' && tag.startsWith('title:'))?.replace('title:', '') : undefined),
    };
  });

  fastify.delete('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    try {
      await deleteFromR2(item.r2_key);
    } catch (error) {
      fastify.log.warn({ error }, '[Admin Route] Failed to delete media from R2, deleting DB row anyway');
    }

    await prisma.mediaAsset.delete({ where: { id } });
    return { message: 'Media deleted' };
  });

  fastify.delete('/media/bulk', { preHandler: auth }, async (request: FastifyRequest) => {
    const body = z.object({
      ids: z.array(z.string().min(1)).min(1),
    }).parse(request.body);

    const items = await prisma.mediaAsset.findMany({
      where: { id: { in: body.ids } },
    });

    for (const item of items) {
      try {
        await deleteFromR2(item.r2_key);
      } catch (error) {
        fastify.log.warn({ error }, `[Admin Route] Failed to delete R2 object ${item.r2_key}`);
      }
    }

    await prisma.mediaAsset.deleteMany({
      where: { id: { in: body.ids } },
    });

    return { message: 'Media deleted' };
  });
}
