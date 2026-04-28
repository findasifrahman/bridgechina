import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function ensureRoles() {
  const roles = ['CUSTOMER', 'SELLER', 'ADMIN'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function ensureUser(email: string, password: string, roleName: string, phone?: string | null) {
  const password_hash = await argon2.hash(password);
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  return prisma.user.upsert({
    where: { email },
    update: {
      phone: phone ?? undefined,
    },
    create: {
      email,
      phone: phone ?? null,
      password_hash,
      status: 'active',
      roles: {
        create: {
          role: {
            connect: { name: roleName },
          },
        },
      },
    },
  });
}

async function main() {
  console.log('Seeding ChinabuyBD ecommerce database...');

  await ensureRoles();
  console.log('✓ Roles created');

  const admin = await ensureUser('admin@chinabuybd.com', 'admin123', 'ADMIN', '+8613888888888');
  const seller = await ensureUser('seller@chinabuybd.com', 'seller123', 'SELLER', '+8613999999999');
  const customer = await ensureUser('customer@chinabuybd.com', 'customer123', 'CUSTOMER', '+8801700000000');

  await prisma.sellerProfile.upsert({
    where: { user_id: seller.id },
    update: {},
    create: {
      user_id: seller.id,
      shop_name: 'ChinaBuybd Store',
      display_name: 'ChinaBuybd Store',
      contact_name: 'ChinaBuybd Team',
      whatsapp: '+8613999999999',
      email: 'seller@chinabuybd.com',
      description: 'Premium China shopping concierge with seller approval workflow.',
      address_text: 'Room 13D, No. 29, Jianshe Sixth Road, Yuexiu District, Rongjin building, Taojin Guangzhou',
      service_area: 'Guangzhou, China',
      verified: true,
      is_active: true,
    },
  });
  console.log('✓ Default seller profile created');

  const categories = [
    {
      name: 'Bags',
      slug: 'bags',
      icon: 'shopping-bag',
      sort_order: 1,
      children: [
        { name: 'Hand Bags', slug: 'bags-hand-bags', icon: 'bag', sort_order: 1 },
        { name: 'Backpacks', slug: 'bags-backpacks', icon: 'backpack', sort_order: 2 },
        { name: 'Wallet', slug: 'bags-wallet', icon: 'wallet', sort_order: 3 },
        { name: 'Suitcase', slug: 'bags-suitcase', icon: 'luggage', sort_order: 4 },
      ],
    },
    {
      name: 'Jewelry',
      slug: 'jewelry',
      icon: 'sparkles',
      sort_order: 2,
      children: [
        { name: 'Necklace', slug: 'jewelry-necklace', icon: 'sparkles', sort_order: 1 },
        { name: 'Rings', slug: 'jewelry-rings', icon: 'sparkles', sort_order: 2 },
        { name: 'Earrings', slug: 'jewelry-earrings', icon: 'sparkles', sort_order: 3 },
        { name: 'Bracelets', slug: 'jewelry-bracelets', icon: 'sparkles', sort_order: 4 },
      ],
    },
    {
      name: 'Shoes',
      slug: 'shoes',
      icon: 'footprints',
      sort_order: 3,
      children: [
        { name: 'Sneakers', slug: 'shoes-sneakers', icon: 'footprints', sort_order: 1 },
        { name: 'Ladies Shoes', slug: 'shoes-ladies', icon: 'footprints', sort_order: 2 },
        { name: 'Formal Shoes', slug: 'shoes-formal', icon: 'footprints', sort_order: 3 },
        { name: 'High Heels', slug: 'shoes-heels', icon: 'footprints', sort_order: 4 },
      ],
    },
    {
      name: 'Beauty',
      slug: 'beauty',
      icon: 'sparkles',
      sort_order: 4,
      children: [
        { name: 'Skincare', slug: 'beauty-skincare', icon: 'sparkles', sort_order: 1 },
        { name: 'Makeup', slug: 'beauty-makeup', icon: 'sparkles', sort_order: 2 },
        { name: 'Hair Care', slug: 'beauty-hair-care', icon: 'sparkles', sort_order: 3 },
      ],
    },
    {
      name: 'Mens Wear',
      slug: 'mens-wear',
      icon: 'shirt',
      sort_order: 5,
      children: [
        { name: 'T-Shirts', slug: 'mens-tshirts', icon: 'shirt', sort_order: 1 },
        { name: 'Pants', slug: 'mens-pants', icon: 'shirt', sort_order: 2 },
        { name: 'Jackets', slug: 'mens-jackets', icon: 'shirt', sort_order: 3 },
      ],
    },
    {
      name: 'Women Wear',
      slug: 'women-wear',
      icon: 'dress',
      sort_order: 6,
      children: [
        { name: 'Dresses', slug: 'women-dresses', icon: 'dress', sort_order: 1 },
        { name: 'Tops', slug: 'women-tops', icon: 'dress', sort_order: 2 },
        { name: 'Skirts', slug: 'women-skirts', icon: 'dress', sort_order: 3 },
      ],
    },
    {
      name: 'Eyewear',
      slug: 'eyewear',
      icon: 'glasses',
      sort_order: 7,
      children: [
        { name: 'Sunglasses', slug: 'eyewear-sunglasses', icon: 'glasses', sort_order: 1 },
        { name: 'Frames', slug: 'eyewear-frames', icon: 'glasses', sort_order: 2 },
      ],
    },
    {
      name: 'Baby Items',
      slug: 'baby-items',
      icon: 'baby',
      sort_order: 8,
      children: [
        { name: 'Baby Clothing', slug: 'baby-clothing', icon: 'baby', sort_order: 1 },
        { name: 'Baby Toys', slug: 'baby-toys', icon: 'baby', sort_order: 2 },
      ],
    },
    {
      name: 'Watches',
      slug: 'watches',
      icon: 'watch',
      sort_order: 9,
      children: [
        { name: 'Mens Watch', slug: 'watches-men', icon: 'watch', sort_order: 1 },
        { name: 'Women Watch', slug: 'watches-women', icon: 'watch', sort_order: 2 },
      ],
    },
    {
      name: 'Gadgets',
      slug: 'gadgets',
      icon: 'smartphone',
      sort_order: 10,
      children: [
        { name: 'Phones', slug: 'gadgets-phones', icon: 'smartphone', sort_order: 1 },
        { name: 'Accessories', slug: 'gadgets-accessories', icon: 'smartphone', sort_order: 2 },
      ],
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      icon: 'home',
      sort_order: 11,
      children: [
        { name: 'Kitchen', slug: 'home-kitchen', icon: 'home', sort_order: 1 },
        { name: 'Furniture', slug: 'home-furniture', icon: 'home', sort_order: 2 },
      ],
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      icon: 'volleyball',
      sort_order: 12,
      children: [
        { name: 'Fitness', slug: 'sports-fitness', icon: 'volleyball', sort_order: 1 },
        { name: 'Camping', slug: 'sports-camping', icon: 'volleyball', sort_order: 2 },
      ],
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const category of categories) {
    const parent = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: true,
        parent_id: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sort_order: category.sort_order,
      },
    });
    categoryMap.set(parent.slug, parent.id);

    for (const child of category.children || []) {
      const childRecord = await prisma.productCategory.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          icon: child.icon,
          sort_order: child.sort_order,
          is_active: true,
          parent_id: parent.id,
        },
        create: {
          name: child.name,
          slug: child.slug,
          icon: child.icon,
          sort_order: child.sort_order,
          parent_id: parent.id,
        },
      });
      categoryMap.set(childRecord.slug, childRecord.id);
    }
  }
  console.log('✓ Product categories created');

  const products = [
    {
      slug: 'leather-travel-bag',
      category: 'bags',
      title: 'Leather Travel Bag',
      price: 2380,
      original_price: 2890,
      stock_qty: 120,
      brand: 'ChinaBuyBD',
      description: 'Premium travel bag for cross-border sourcing and fast shipping.',
      tags: ['featured', 'new'],
      weight_kg: 0.85,
    },
    {
      slug: 'classic-stainless-watch',
      category: 'watches',
      title: 'Classic Stainless Watch',
      price: 1680,
      original_price: 1990,
      stock_qty: 80,
      brand: 'ChinaBuyBD',
      description: 'Minimal stainless watch with premium finish.',
      tags: ['bestseller'],
      weight_kg: 0.18,
    },
    {
      slug: 'comfort-running-shoes',
      category: 'shoes',
      title: 'Comfort Running Shoes',
      price: 3200,
      original_price: 3590,
      stock_qty: 60,
      brand: 'ChinaBuyBD',
      description: 'Lightweight shoes built for daily wear and sourcing demos.',
      tags: ['best-value'],
      weight_kg: 0.65,
    },
  ];

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: {
        sku: product.slug,
      },
      update: {
        title: product.title,
        price: product.price,
        original_price: product.original_price,
        stock_qty: product.stock_qty,
        brand: product.brand,
        description: product.description,
        tags: product.tags as any,
        weight_kg: product.weight_kg,
        status: 'published',
        source_kind: 'manual',
      },
      create: {
        seller_id: seller.id,
        category_id: categoryId,
        title: product.title,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        stock_qty: product.stock_qty,
        brand: product.brand,
        tags: product.tags as any,
        weight_kg: product.weight_kg,
        sku: product.slug,
        status: 'published',
        source_kind: 'manual',
      },
    });
  }
  console.log('✓ Sample products created');

  await prisma.homepageBanner.upsert({
    where: { id: 'bridgechina-home-banner' },
    update: {
      title: 'Get factory price with fastest delivery',
      subtitle: 'Premium shopping concierge for China sourcing',
      link: '/shopping',
      cta_text: 'Shop now',
      is_active: true,
      sort_order: 1,
    },
    create: {
      id: 'bridgechina-home-banner',
      title: 'Get factory price with fastest delivery',
      subtitle: 'Premium shopping concierge for China sourcing',
      link: '/shopping',
      cta_text: 'Shop now',
      is_active: true,
      sort_order: 1,
    },
  });

  await prisma.homepageOffer.upsert({
    where: { id: 'bridgechina-hero-offer' },
    update: {
      title: 'Cash on order, proof later',
      subtitle: 'Upload payment slip from your profile',
      description: 'Seller approval, admin purchase, then shipment updates.',
      offer_type: 'trust',
      currency: 'BDT',
      value: 0,
      is_active: true,
      sort_order: 1,
    },
    create: {
      id: 'bridgechina-hero-offer',
      title: 'Cash on order, proof later',
      subtitle: 'Upload payment slip from your profile',
      description: 'Seller approval, admin purchase, then shipment updates.',
      offer_type: 'trust',
      currency: 'BDT',
      value: 0,
      is_active: true,
      sort_order: 1,
    },
  });
  console.log('✓ Homepage content created');

  await prisma.moqShoppingOtapiRule.upsert({
    where: { scope: 'global' },
    update: {
      minimum_product: 3,
      minimum_price_threshold: 500,
      currency: 'BDT',
      updated_by: admin.id,
    },
    create: {
      scope: 'global',
      minimum_product: 3,
      minimum_price_threshold: 500,
      currency: 'BDT',
      updated_by: admin.id,
    },
  });
  console.log('âœ“ MOQ rule created');

  await prisma.blogPost.upsert({
    where: { slug: 'welcome-to-chinabuybd' },
    update: {},
    create: {
      slug: 'welcome-to-chinabuybd',
      title: 'Welcome to ChinaBuyBD',
      excerpt: 'How the new shopping-first workflow works.',
      content_md: '# ChinaBuyBD\n\nA shopping-first China sourcing experience.',
      status: 'published',
      published_at: new Date(),
      created_by: admin.id,
    },
  });
  console.log('✓ Blog post created');

  console.log('\n✅ Seeding completed!');
  console.log('Admin: admin@chinabuybd.com / admin123');
  console.log('Seller: seller@chinabuybd.com / seller123');
  console.log('Customer: customer@chinabuybd.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
