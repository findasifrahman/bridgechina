import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { escapeHtml, sendMail } from '../utils/mailer.js';

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

const checkoutItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  qty: z.number().int().positive(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  imageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  skuDetails: z.array(z.object({
    specId: z.string().min(1),
    qty: z.number().int().positive(),
    sku: z.any().optional(),
    label: z.string().optional(),
    sourceUnitPrice: z.number().positive().optional(),
    displayUnitPrice: z.number().positive().optional(),
  })).optional(),
  selectedShippingMethod: z.string().optional(),
  estimatedWeight: z.number().min(0).optional(),
});

function sanitizeSkuDetails(value: z.infer<typeof checkoutItemSchema>['skuDetails']) {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return value
    .map((row) => ({
      specId: String(row.specId),
      qty: Number(row.qty),
      sku: row.sku ?? null,
      label: row.label || null,
      sourceUnitPrice: row.sourceUnitPrice ?? null,
      displayUnitPrice: row.displayUnitPrice ?? null,
    }))
    .filter((row) => row.specId && row.qty > 0);
}

function resolveCheckoutUnitPrice(item: z.infer<typeof checkoutItemSchema>) {
  const skuDetails = sanitizeSkuDetails(item.skuDetails);
  if (skuDetails?.length) {
    const totalQty = skuDetails.reduce((sum, row) => sum + row.qty, 0);
    const totalAmount = skuDetails.reduce((sum, row) => {
      const unitPrice = Number(row.displayUnitPrice ?? row.sourceUnitPrice ?? item.priceMin ?? item.priceMax ?? 0);
      return sum + unitPrice * row.qty;
    }, 0);
    return totalQty > 0 ? totalAmount / totalQty : 0;
  }

  return Number(item.priceMin ?? item.priceMax ?? 0);
}

const normalizeCouponCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');

async function evaluateCoupon(
  db: typeof prisma,
  params: { code: string; subtotal: number; currency: string; userId: string },
) {
  const code = normalizeCouponCode(params.code);
  if (!code) return { coupon: null, discountAmount: 0, error: 'Enter a coupon code' };

  const [coupon] = await db.$queryRaw(Prisma.sql`
    SELECT *
    FROM "coupons"
    WHERE "code" = ${code}
    LIMIT 1
  `) as any[];

  if (!coupon) return { coupon: null, discountAmount: 0, error: 'Coupon code not found' };
  if (!coupon.is_active) return { coupon, discountAmount: 0, error: 'Coupon is not active' };
  if (coupon.currency && coupon.currency !== params.currency) return { coupon, discountAmount: 0, error: `Coupon is only valid for ${coupon.currency}` };

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return { coupon, discountAmount: 0, error: 'Coupon is not active yet' };
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return { coupon, discountAmount: 0, error: 'Coupon has expired' };
  if (coupon.usage_limit !== null && Number(coupon.usage_count || 0) >= Number(coupon.usage_limit)) {
    return { coupon, discountAmount: 0, error: 'Coupon usage limit reached' };
  }
  if (params.subtotal < Number(coupon.min_order_amount || 0)) {
    return {
      coupon,
      discountAmount: 0,
      error: `Minimum order amount for this coupon is ${Number(coupon.min_order_amount || 0).toLocaleString('en-US')} ${coupon.currency || params.currency}`,
    };
  }

  const [usage] = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "coupon_redemptions"
    WHERE "coupon_id" = ${coupon.id} AND "user_id" = ${params.userId}
  `) as any[];
  if (Number(usage?.count || 0) >= Number(coupon.per_user_limit || 1)) {
    return { coupon, discountAmount: 0, error: 'You have already used this coupon' };
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percent') {
    discountAmount = params.subtotal * (Number(coupon.discount_value) / 100);
    if (coupon.max_discount_amount !== null) {
      discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
    }
  } else {
    discountAmount = Number(coupon.discount_value);
  }

  discountAmount = Math.max(0, Math.min(params.subtotal, Math.round(discountAmount)));
  if (discountAmount <= 0) return { coupon, discountAmount: 0, error: 'Coupon discount is not available' };
  return { coupon, discountAmount, error: null };
}

async function getDefaultSellerAndCategory() {
  const [defaultSeller, defaultCategory] = await Promise.all([
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

  return { defaultSeller, defaultCategory };
}

async function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `BC-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const existing = await prisma.order.findUnique({
      where: { order_number: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `BC-${datePart}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

async function calculateServerShippingFee(method: string, items: Array<{ qty: number; estimated_weight_kg?: number | null }>) {
  const totalWeight = items.reduce((sum, item) => {
    const weight = Number(item.estimated_weight_kg || 0);
    return sum + (weight > 0 ? weight * item.qty : 0);
  }, 0);
  if (totalWeight <= 0) return 0;

  const rate = await prisma.shippingRateSetting.findFirst({
    where: {
      method,
      currency: 'BDT',
      is_active: true,
    },
  });

  if (!rate) return 0;
  return Math.round(totalWeight * rate.min_rate_per_kg);
}

async function sendOrderConfirmationEmail(order: any) {
  const email = order.user?.email;
  if (!email) return;

  const lines = (order.items || []).map((item: any) => {
    const title = item.title_snapshot || item.product?.title || 'Product';
    return `${title} x ${item.qty} - ${order.currency} ${(Number(item.price_snapshot || 0) * Number(item.qty || 0)).toLocaleString('en-US')}`;
  });
  const htmlItems = lines.map((line: string) => `<li>${escapeHtml(line)}</li>`).join('');

  await sendMail({
    to: email,
    subject: `ChinaBuyBD order ${order.order_number} received`,
    text: [
      `Your order ${order.order_number} has been received.`,
      '',
      `Subtotal: ${order.currency} ${Number(order.subtotal || 0).toLocaleString('en-US')}`,
      ...(Number(order.discount_amount || 0) > 0 ? [`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${order.currency} ${Number(order.discount_amount || 0).toLocaleString('en-US')}`] : []),
      `Shipping: ${order.currency} ${Number(order.shipping_fee || 0).toLocaleString('en-US')}`,
      `Total: ${order.currency} ${Number(order.total || 0).toLocaleString('en-US')}`,
      '',
      'Items:',
      ...lines,
      '',
      'Payment is not collected now. Upload your payment slip from your orders page.',
    ].join('\n'),
    html: `
      <p>Your order <strong>${escapeHtml(order.order_number)}</strong> has been received.</p>
      <ul>${htmlItems}</ul>
      <p><strong>Subtotal:</strong> ${escapeHtml(order.currency)} ${Number(order.subtotal || 0).toLocaleString('en-US')}</p>
      ${Number(order.discount_amount || 0) > 0 ? `<p><strong>Discount${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ''}:</strong> -${escapeHtml(order.currency)} ${Number(order.discount_amount || 0).toLocaleString('en-US')}</p>` : ''}
      <p><strong>Shipping:</strong> ${escapeHtml(order.currency)} ${Number(order.shipping_fee || 0).toLocaleString('en-US')}</p>
      <p><strong>Total:</strong> ${escapeHtml(order.currency)} ${Number(order.total || 0).toLocaleString('en-US')}</p>
      <p>Payment is not collected now. Upload your payment slip from your orders page.</p>
    `,
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

  fastify.post('/cart/sync', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      currency: z.string().optional(),
      items: z.array(checkoutItemSchema).default([]),
    }).parse(request.body);

    const { defaultSeller, defaultCategory } = await getDefaultSellerAndCategory();
    if (!defaultSeller || !defaultCategory) {
      return reply.status(500).send({ error: 'Default seller or category is not configured' });
    }

    const cart = await prisma.cart.upsert({
      where: { user_id: req.user.id },
      update: {},
      create: { user_id: req.user.id },
    });

    const itemsToSync = body.items.map((item) => ({
      item,
      unitPrice: resolveCheckoutUnitPrice(item),
    }));
    const invalidItem = itemsToSync.find((entry) => entry.unitPrice <= 0);
    if (invalidItem) {
      return reply.status(400).send({ error: `Valid price is required for ${invalidItem.item.title}.` });
    }

    await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });

    for (const { item, unitPrice } of itemsToSync) {
      let product = await prisma.product.findFirst({
        where: {
          OR: [
            { external_id: item.externalId },
            { id: item.externalId },
          ],
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            seller_id: defaultSeller.id,
            category_id: defaultCategory.id,
            title: item.title,
            description: null,
            price: unitPrice,
            currency: body.currency || 'BDT',
            stock_qty: 0,
            minimum_order_qty: 1,
            status: 'published',
            source_kind: 'checkout',
            source_url: item.sourceUrl || null,
            external_id: item.externalId,
          },
        });
      }

      await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id: product.id,
          seller_id: product.seller_id,
          qty: item.qty,
          price_snapshot: unitPrice,
          currency_snapshot: body.currency || product.currency || 'BDT',
          title_snapshot: item.title,
          sku_details_snapshot: sanitizeSkuDetails(item.skuDetails) || undefined,
          image_url_snapshot: item.imageUrl || null,
          source_url_snapshot: item.sourceUrl || product.source_url || null,
          selected_shipping_method: item.selectedShippingMethod || null,
          estimated_weight_kg: item.estimatedWeight ?? null,
        },
      });
    }

    return getOrCreateCart(req.user.id);
  });

  fastify.post('/coupons/validate', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      code: z.string().min(1),
      subtotal: z.number().min(0),
      currency: z.string().min(1).default('BDT'),
    }).parse(request.body);

    const result = await evaluateCoupon(prisma, {
      code: body.code,
      subtotal: body.subtotal,
      currency: body.currency,
      userId: req.user.id,
    });

    if (result.error) {
      return reply.status(400).send({ error: result.error });
    }

    return {
      code: result.coupon.code,
      discount_amount: result.discountAmount,
      discount_type: result.coupon.discount_type,
      discount_value: result.coupon.discount_value,
      currency: result.coupon.currency,
    };
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
      shipping_method: z.string().optional(),
      currency: z.string().optional(),
      coupon_code: z.string().optional(),
      items: z.array(checkoutItemSchema).optional(),
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
          price: resolveCheckoutUnitPrice(item),
          sourceUrl: item.sourceUrl,
          imageUrl: item.imageUrl,
          skuDetails: sanitizeSkuDetails(item.skuDetails),
          selectedShippingMethod: item.selectedShippingMethod,
          estimatedWeight: item.estimatedWeight,
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
      imageUrl: item.image_url_snapshot || undefined,
      skuDetails: Array.isArray(item.sku_details_snapshot) ? item.sku_details_snapshot : undefined,
      selectedShippingMethod: item.selected_shipping_method || undefined,
      estimatedWeight: item.estimated_weight_kg ?? undefined,
    }));

    const { defaultSeller, defaultCategory } = await getDefaultSellerAndCategory();

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
      sku_details_snapshot?: any;
      image_url_snapshot?: string | null;
      source_url_snapshot?: string | null;
      selected_shipping_method?: string | null;
      estimated_weight_kg?: number | null;
    }> = [];
    for (const item of itemsToCheckout) {
      let product = await prisma.product.findFirst({
        where: {
          OR: [
            { external_id: item.productId },
            { id: item.productId },
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
        if (item.price <= 0) {
          return reply.status(400).send({ error: `Valid price is required for ${item.title}.` });
        }

        product = await prisma.product.create({
          data: {
            seller_id: defaultSeller.id,
            category_id: defaultCategory.id,
            title: item.title,
            description: null,
            price: item.price,
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
        price_snapshot: item.price > 0 ? item.price : product.price,
        currency_snapshot: body.currency || product.currency || 'BDT',
        title_snapshot: item.title,
        sku_details_snapshot: item.skuDetails || undefined,
        image_url_snapshot: item.imageUrl || null,
        source_url_snapshot: item.sourceUrl || product.source_url || null,
        selected_shipping_method: item.selectedShippingMethod || body.shipping_method || null,
        estimated_weight_kg: item.estimatedWeight ?? product.weight_kg ?? null,
      });
    }

    const currency = body.currency || 'BDT';
    const subtotal = resolvedItems.reduce((sum, item) => sum + item.price_snapshot * item.qty, 0);
    if (subtotal < minimumPriceThreshold) {
      return reply.status(400).send({
        error: `Minimum order amount is ${minimumPriceThreshold.toLocaleString('en-US')} ${currency}.`,
      });
    }
    const shippingMethod = body.shipping_method || 'air';
    const shippingFee = await calculateServerShippingFee(shippingMethod, resolvedItems);
    const couponResult = body.coupon_code
      ? await evaluateCoupon(prisma, {
          code: body.coupon_code,
          subtotal,
          currency,
          userId: req.user.id,
        })
      : { coupon: null, discountAmount: 0, error: null };
    if (couponResult.error) {
      return reply.status(400).send({ error: couponResult.error });
    }
    const discountAmount = couponResult.discountAmount || 0;
    const orderNumber = await generateOrderNumber();

    let order: any;
    try {
      order = await prisma.$transaction(async (tx) => {
      let finalCoupon = couponResult.coupon;
      let finalDiscountAmount = discountAmount;
      if (body.coupon_code) {
        const freshResult = await evaluateCoupon(tx as any, {
          code: body.coupon_code,
          subtotal,
          currency,
          userId: req.user.id,
        });
        if (freshResult.error) {
          throw new Error(freshResult.error);
        }
        finalCoupon = freshResult.coupon;
        finalDiscountAmount = freshResult.discountAmount;
      }

      const createdOrder = await tx.order.create({
        data: {
          order_number: orderNumber,
          user_id: req.user.id,
          status: 'pending_payment',
          payment_status: 'unsubmitted',
          currency,
          subtotal,
          discount_amount: finalDiscountAmount,
          coupon_code: finalCoupon?.code || null,
          coupon_id: finalCoupon?.id || null,
          shipping_fee: shippingFee,
          total: Math.max(0, subtotal - finalDiscountAmount) + shippingFee,
          shipping_method: shippingMethod,
          shipping_address_id: body.shipping_address_id,
          notes: body.notes || null,
          items: {
            create: resolvedItems,
          },
        } as any,
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
          user: true,
        },
      });

      if (finalCoupon && finalDiscountAmount > 0) {
        const updated = await tx.$queryRaw(Prisma.sql`
          UPDATE "coupons"
          SET "usage_count" = "usage_count" + 1, "updated_at" = NOW()
          WHERE "id" = ${finalCoupon.id}
            AND ("usage_limit" IS NULL OR "usage_count" < "usage_limit")
          RETURNING "id"
        `) as any[];
        if (updated.length === 0) {
          throw new Error('Coupon usage limit reached');
        }

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "coupon_redemptions" (
            "id", "coupon_id", "user_id", "order_id", "coupon_code", "discount_amount"
          )
          VALUES (
            ${randomUUID()}, ${finalCoupon.id}, ${req.user.id}, ${createdOrder.id},
            ${finalCoupon.code}, ${finalDiscountAmount}
          )
        `);
      }

      if (cart) {
        await tx.cartItem.deleteMany({ where: { cart_id: cart.id } });
      }

        return createdOrder;
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to apply coupon';
      if (message.toLowerCase().includes('coupon')) {
        return reply.status(400).send({ error: message });
      }
      throw error;
    }

    sendOrderConfirmationEmail(order).catch((error) => {
      fastify.log.error({ err: error, orderId: order.id }, '[User Route] Failed to send order confirmation email');
    });

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

  fastify.patch('/orders/:id/cancel', { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      note: z.string().optional(),
    }).parse(request.body || {});

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.user_id !== req.user.id) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    if (!['pending_payment', 'pending_review', 'pending_purchase'].includes(order.status)) {
      return reply.status(409).send({ error: 'This order can no longer be cancelled by the customer' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    await prisma.orderStatusEvent.create({
      data: {
        order_id: id,
        status_from: order.status,
        status_to: 'cancelled',
        note: body.note || 'Cancelled by customer',
        created_by: req.user.id,
      },
    });

    return updated;
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

    return prisma.$transaction(async (tx) => {
      const proof = await tx.paymentProof.create({
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

      if (order.payment_status !== 'approved') {
        await tx.order.update({
          where: { id },
          data: { payment_status: 'submitted' },
        });
      }

      return proof;
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
