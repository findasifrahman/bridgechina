import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const authPreHandler = [async (request: FastifyRequest, reply: FastifyReply) => {
  const fastify = request.server as FastifyInstance & { authenticate?: any };
  if (!fastify.authenticate) {
    reply.status(500).send({ error: 'Authentication not configured' });
    return;
  }
  await fastify.authenticate(request, reply);
}];

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { user_id: userId },
    update: {},
    create: { user_id: userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              coverAsset: true,
              category: true,
              seller: {
                include: {
                  sellerProfile: true,
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              phone: true,
              sellerProfile: true,
            },
          },
        },
      },
    },
  });
}

async function getActiveMoqRule() {
  return prisma.moqShoppingOtapiRule.findUnique({
    where: { scope: 'global' },
  });
}

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/profile', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    return prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        customerProfile: {
          include: {
            avatarAsset: true,
          },
        },
        sellerProfile: {
          include: {
            logoAsset: true,
            bannerAsset: true,
          },
        },
        roles: {
          include: { role: true },
        },
      },
    });
  });

  fastify.patch('/profile', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    const body = request.body as {
      phone?: string;
      customerProfile?: {
        full_name?: string;
        nationality?: string;
        passport_name?: string;
        preferred_language?: string;
        preferred_currency?: string;
        preferred_contact_channel?: string;
        wechat_id?: string;
        marketing_consent?: boolean;
        avatar_asset_id?: string | null;
      };
    };

    if (body.phone !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { phone: body.phone || null },
      });
    }

    if (body.customerProfile) {
      await prisma.customerProfile.upsert({
        where: { user_id: req.user.id },
        update: {
          full_name: body.customerProfile.full_name ?? undefined,
          nationality: body.customerProfile.nationality ?? undefined,
          passport_name: body.customerProfile.passport_name ?? undefined,
          preferred_language: body.customerProfile.preferred_language ?? undefined,
          preferred_currency: body.customerProfile.preferred_currency ?? undefined,
          preferred_contact_channel: body.customerProfile.preferred_contact_channel ?? undefined,
          wechat_id: body.customerProfile.wechat_id ?? undefined,
          marketing_consent: body.customerProfile.marketing_consent ?? undefined,
          avatar_asset_id: body.customerProfile.avatar_asset_id ?? undefined,
        },
        create: {
          user_id: req.user.id,
          full_name: body.customerProfile.full_name || null,
          nationality: body.customerProfile.nationality || null,
          passport_name: body.customerProfile.passport_name || null,
          preferred_language: body.customerProfile.preferred_language || null,
          preferred_currency: body.customerProfile.preferred_currency || 'BDT',
          preferred_contact_channel: body.customerProfile.preferred_contact_channel || null,
          wechat_id: body.customerProfile.wechat_id || null,
          marketing_consent: body.customerProfile.marketing_consent || false,
          avatar_asset_id: body.customerProfile.avatar_asset_id || null,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        customerProfile: {
          include: { avatarAsset: true },
        },
      },
    });
  });

  fastify.get('/addresses', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    return prisma.address.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/addresses', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = request.body as {
      name: string;
      phone: string;
      country?: string;
      city: string;
      address_line: string;
      postal_code?: string;
      geo_lat?: number;
      geo_lng?: number;
      notes?: string;
      is_default?: boolean;
    };

    if (!body.name || !body.phone || !body.city || !body.address_line) {
      return reply.status(400).send({ error: 'Missing required address fields' });
    }

    return prisma.address.create({
      data: {
        user_id: req.user.id,
        name: body.name,
        phone: body.phone,
        country: body.country || 'Bangladesh',
        city: body.city,
        address_line: body.address_line,
        postal_code: body.postal_code || null,
        geo_lat: body.geo_lat || null,
        geo_lng: body.geo_lng || null,
        notes: body.notes || null,
        is_default: body.is_default || false,
      },
    });
  });

  fastify.put('/addresses/:id', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Address not found' });
    }

    return prisma.address.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        country: body.country ?? undefined,
        city: body.city ?? undefined,
        address_line: body.address_line ?? undefined,
        postal_code: body.postal_code ?? undefined,
        geo_lat: body.geo_lat ?? undefined,
        geo_lng: body.geo_lng ?? undefined,
        notes: body.notes ?? undefined,
        is_default: body.is_default ?? undefined,
      },
    });
  });

  fastify.delete('/addresses/:id', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Address not found' });
    }

    await prisma.address.delete({ where: { id } });
    return { message: 'Address deleted' };
  });

  fastify.get('/cart', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    return getOrCreateCart(req.user.id);
  });

  fastify.post('/cart/items', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      product_id: z.string().min(1),
      qty: z.number().int().positive().default(1),
    }).parse(request.body);

    const product = await prisma.product.findUnique({
      where: { id: body.product_id },
      include: { seller: true },
    });
    if (!product || product.status !== 'published') {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const moqRule = await getActiveMoqRule();
    const minimumQty = Math.max(product.minimum_order_qty || 1, moqRule?.minimum_product || 1);
    if (body.qty < minimumQty) {
      return reply.status(400).send({
        error: `MOQ is ${minimumQty}. Please add at least ${minimumQty} units before checkout.`,
      });
    }

    const cart = await prisma.cart.upsert({
      where: { user_id: req.user.id },
      update: {},
      create: { user_id: req.user.id },
    });

    const existing = await prisma.cartItem.findFirst({
      where: { cart_id: cart.id, product_id: product.id },
    });

    if (existing) {
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          qty: existing.qty + body.qty,
          price_snapshot: product.price,
          currency_snapshot: product.currency,
          title_snapshot: product.title,
          seller_id: product.seller_id,
        },
      });
    }

    return prisma.cartItem.create({
      data: {
        cart_id: cart.id,
        product_id: product.id,
        seller_id: product.seller_id,
        qty: body.qty,
        price_snapshot: product.price,
        currency_snapshot: product.currency,
        title_snapshot: product.title,
      },
    });
  });

  fastify.patch('/cart/items/:id', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      qty: z.number().int().min(1),
    }).parse(request.body);

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });
    if (!cartItem || cartItem.cart.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Cart item not found' });
    }

    return prisma.cartItem.update({
      where: { id },
      data: { qty: body.qty },
    });
  });

  fastify.delete('/cart/items/:id', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });
    if (!cartItem || cartItem.cart.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({ where: { id } });
    return { message: 'Cart item removed' };
  });

  fastify.delete('/cart', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    const cart = await prisma.cart.findUnique({ where: { user_id: req.user.id } });
    if (!cart) {
      return { message: 'Cart cleared' };
    }

    await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
    return { message: 'Cart cleared' };
  });

  fastify.post('/orders/checkout', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      shipping_address_id: z.string().min(1),
      notes: z.string().optional(),
      shipping_fee: z.number().optional(),
      shipping_method: z.string().optional(),
      currency: z.string().optional(),
      items: z.array(z.object({
        externalId: z.string().min(1),
        title: z.string().min(1),
        qty: z.number().int().positive(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        imageUrl: z.string().optional(),
        sourceUrl: z.string().optional(),
      })).optional(),
    }).parse(request.body);

    const address = await prisma.address.findUnique({
      where: { id: body.shipping_address_id },
    });
    if (!address || address.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Shipping address not found' });
    }

    const sourceItems = body.items && body.items.length > 0
      ? body.items.map((item) => ({
          productId: item.externalId,
          title: item.title,
          qty: item.qty,
          price: Number(item.priceMin ?? item.priceMax ?? 0),
          sourceUrl: item.sourceUrl,
        }))
      : null;

    const moqRule = await getActiveMoqRule();
    const minimumQtyThreshold = moqRule?.minimum_product || 1;
    const minimumPriceThreshold = moqRule?.minimum_price_threshold || 0;

    const cart = sourceItems
      ? null
      : await prisma.cart.findUnique({
          where: { user_id: req.user.id },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

    if ((!cart || cart.items.length === 0) && (!sourceItems || sourceItems.length === 0)) {
      return reply.status(400).send({ error: 'Cart is empty' });
    }

    const itemsToCheckout = sourceItems || cart!.items.map((item) => ({
      productId: item.product_id,
      title: item.title_snapshot || item.product?.title || 'Product',
      qty: item.qty,
      price: item.price_snapshot,
      sourceUrl: item.product?.source_url || null,
    }));

    const defaultSeller = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: { name: 'SELLER' },
          },
        },
      },
    });

    const defaultCategory = await prisma.productCategory.findFirst({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    if (!defaultSeller || !defaultCategory) {
      return reply.status(500).send({ error: 'Default seller or category is not configured' });
    }

    const resolvedItems: Array<{
      product_id: string;
      seller_id: string;
      qty: number;
      price_snapshot: number;
      currency_snapshot: string;
      title_snapshot: string;
    }> = [];
    for (const item of itemsToCheckout) {
      let product = await prisma.product.findFirst({
        where: {
          OR: [
            { external_id: item.productId },
            { id: item.productId },
            { title: item.title, seller_id: defaultSeller.id },
          ],
        },
      });

      const itemMinQty = Math.max(product?.minimum_order_qty || 1, minimumQtyThreshold);
      if (item.qty < itemMinQty) {
        return reply.status(400).send({
          error: `MOQ is ${itemMinQty} for ${item.title}. Please increase quantity before checkout.`,
        });
      }

      if (!product) {
        product = await prisma.product.create({
          data: {
            seller_id: defaultSeller.id,
            category_id: defaultCategory.id,
            title: item.title,
            description: null,
            price: item.price || 0,
            currency: body.currency || 'BDT',
            stock_qty: 0,
            minimum_order_qty: minimumQtyThreshold,
            status: 'published',
            source_kind: 'checkout',
            source_url: item.sourceUrl || null,
            external_id: item.productId,
          },
        });
      }

      resolvedItems.push({
        product_id: product.id,
        seller_id: product.seller_id,
        qty: item.qty,
        price_snapshot: product.price,
        currency_snapshot: body.currency || product.currency || 'BDT',
        title_snapshot: item.title,
      });
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.price_snapshot * item.qty, 0);
    if (subtotal < minimumPriceThreshold) {
      return reply.status(400).send({
        error: `Minimum order amount is ${minimumPriceThreshold.toLocaleString('en-US')} ${body.currency || 'BDT'}.`,
      });
    }
    const shippingFee = body.shipping_fee ?? 0;
    const orderNumber = `BC-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        order_number: orderNumber,
        user_id: req.user.id,
        status: 'pending_payment',
        payment_status: 'unsubmitted',
        currency: body.currency || 'BDT',
        subtotal,
        shipping_fee: shippingFee,
        total: subtotal + shippingFee,
        shipping_method: body.shipping_method || 'air',
        shipping_address_id: body.shipping_address_id,
        notes: body.notes || null,
        items: {
          create: resolvedItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            seller: {
              select: {
                id: true,
                email: true,
                phone: true,
                sellerProfile: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
    }

    return order;
  });

  fastify.get('/orders', { preHandler: authPreHandler }, async (request: FastifyRequest) => {
    const req = request as any;
    const query = request.query as {
      search?: string;
      page?: string;
      limit?: string;
    };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();

    const where: any = { user_id: req.user.id };
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
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
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  sellerProfile: true,
                },
              },
            },
          },
          shippingAddress: true,
          shippingUpdates: true,
          statusEvents: true,
          paymentProofs: {
            orderBy: { created_at: 'desc' },
            include: {
              asset: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      orders,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/orders/:id', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            seller: {
              select: {
                id: true,
                email: true,
                phone: true,
                sellerProfile: true,
              },
            },
          },
        },
        shippingAddress: true,
        shippingUpdates: true,
        statusEvents: true,
          paymentProofs: {
            orderBy: { created_at: 'desc' },
            include: {
              asset: true,
              reviewer: true,
            },
        },
      },
    });

    if (!order || order.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    return order;
  });

  fastify.post('/orders/:id/payment-proof', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      asset_id: z.string().min(1),
      amount: z.number().optional(),
      notes: z.string().optional(),
    }).parse(request.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    return prisma.paymentProof.create({
      data: {
        order_id: id,
        asset_id: body.asset_id,
        submitted_by: req.user.id,
        amount: body.amount ?? null,
        notes: body.notes ?? null,
        status: 'submitted',
      },
      include: {
        asset: true,
      },
    });
  });

  fastify.get('/orders/:id/payment-proof', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const proof = await prisma.paymentProof.findFirst({
      where: { order_id: id },
      include: { asset: true, reviewer: true },
      orderBy: { created_at: 'desc' },
    });

    return proof ?? null;
  });

  fastify.post('/media/upload', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;

    try {
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
        return reply.status(500).send({ error: 'File upload not configured' });
      }

      const parts = request.parts();
      let fileData: any = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          fileData = part;
          break;
        }
      }

      if (!fileData) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of fileData.file as AsyncIterable<Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fileBuffer = Buffer.concat(chunks);

      const maxSize = 5 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return reply.status(400).send({ error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` });
      }

      const { uploadToR2, getPublicUrl } = await import('../utils/r2.js');
      const timestamp = Date.now();
      const sanitizedFilename = fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;

      await uploadToR2(key, fileBuffer, fileData.mimetype);
      const publicUrl = getPublicUrl(key);

      return prisma.mediaAsset.create({
        data: {
          r2_key: key,
          public_url: publicUrl,
          mime_type: fileData.mimetype,
          size: fileBuffer.length,
          category: 'upload',
          uploaded_by: req.user.id,
        },
      });
    } catch (error: any) {
      fastify.log.error({ error }, '[User Route] /media/upload error');
      return reply.status(500).send({ error: error.message || 'Failed to upload file' });
    }
  });
}
