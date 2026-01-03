import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = ['ADMIN', 'OPS', 'EDITOR', 'SELLER', 'PARTNER', 'USER', 'SERVICE_PROVIDER'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log('✓ Roles created');

  // Create service categories
  const categories = [
    { key: 'hotel', name: 'Hotel Booking' },
    { key: 'transport', name: 'Transport' },
    { key: 'halal_food', name: 'Halal Food' },
    { key: 'medical', name: 'Medical Assistance' },
    { key: 'translation_help', name: 'Translation & Help' },
    { key: 'shopping_service', name: 'Shopping Service' },
    { key: 'tours', name: 'Tours' },
    { key: 'esim', name: 'eSIM Plans' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: cat,
    });
  }
  console.log('✓ Service categories created');

  // Create Guangzhou city
  const guangzhou = await prisma.city.upsert({
    where: { slug: 'guangzhou' },
    update: {},
    create: {
      slug: 'guangzhou',
      name: 'Guangzhou',
      country: 'China',
      is_active: true,
    },
  });
  console.log('✓ Guangzhou city created');

  // Create Hainan city (coming soon)
  await prisma.city.upsert({
    where: { slug: 'hainan' },
    update: {},
    create: {
      slug: 'hainan',
      name: 'Hainan',
      country: 'China',
      is_active: false,
    },
  });
  console.log('✓ Hainan city created');

  // Create admin user
  const adminPassword = await argon2.hash('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bridgechina.com' },
    update: {},
    create: {
      email: 'admin@bridgechina.com',
      password_hash: adminPassword,
      status: 'active',
      roles: {
        create: {
          role: {
            connect: { name: 'ADMIN' },
          },
        },
      },
    },
  });
  console.log('✓ Admin user created (admin@bridgechina.com / admin123)');

  // Create seller user
  const sellerPassword = await argon2.hash('seller123');
  const seller = await prisma.user.upsert({
    where: { email: 'seller@bridgechina.com' },
    update: {},
    create: {
      email: 'seller@bridgechina.com',
      password_hash: sellerPassword,
      status: 'active',
      roles: {
        create: {
          role: {
            connect: { name: 'SELLER' },
          },
        },
      },
    },
  });
  console.log('✓ Seller user created (seller@bridgechina.com / seller123)');

  // Create sample hotels
  const hotels = [
    {
      city_id: guangzhou.id,
      name: 'Guangzhou Marriott Hotel',
      address: '28 Tianhe Road, Tianhe District',
      geo_lat: 23.1358,
      geo_lng: 113.3242,
      price_from: 500,
      currency: 'CNY',
      verified: true,
      description: 'Luxury hotel in the heart of Guangzhou',
      contact_phone: '+86 20 8888 8888',
      gallery_asset_ids: ['https://example.com/hotel1.jpg'],
    },
    {
      city_id: guangzhou.id,
      name: 'Holiday Inn Guangzhou',
      address: '15 Linhe Road, Tianhe District',
      geo_lat: 23.1420,
      geo_lng: 113.3300,
      price_from: 350,
      currency: 'CNY',
      verified: true,
      description: 'Comfortable stay with great amenities',
      contact_phone: '+86 20 8888 8889',
      gallery_asset_ids: ['https://example.com/hotel2.jpg'],
    },
  ];

  for (const hotel of hotels) {
    await prisma.hotel.create({
      data: hotel,
    });
  }
  console.log('✓ Sample hotels created');

  // Create sample restaurants
  const restaurants = [
    {
      city_id: guangzhou.id,
      name: 'Halal Restaurant Guangzhou',
      address: '123 Beijing Road',
      geo_lat: 23.1200,
      geo_lng: 113.2800,
      halal_verified: true,
      delivery_supported: true,
      description: 'Authentic halal cuisine',
      contact_phone: '+86 20 8888 7777',
      gallery_asset_ids: ['https://example.com/restaurant1.jpg'],
    },
  ];

  for (const restaurant of restaurants) {
    await prisma.restaurant.create({
      data: restaurant,
    });
  }
  console.log('✓ Sample restaurants created');

  // Create sample medical centers
  const medicalCenters = [
    {
      city_id: guangzhou.id,
      name: 'Guangzhou First People\'s Hospital',
      type: 'hospital',
      languages: ['English', 'Chinese'],
      verified: true,
      address: '1 Panfu Road, Yuexiu District',
      geo_lat: 23.1300,
      geo_lng: 113.2700,
      contact_phone: '+86 20 8888 6666',
      description: 'Major hospital with English-speaking staff',
      gallery_asset_ids: ['https://example.com/hospital1.jpg'],
    },
  ];

  for (const medical of medicalCenters) {
    await prisma.medicalCenter.create({
      data: medical,
    });
  }
  console.log('✓ Sample medical centers created');

  // Create sample tours
  const tours = [
    {
      city_id: guangzhou.id,
      name: 'Guangzhou City Tour',
      duration_text: 'Half Day',
      price_from: 200,
      currency: 'CNY',
      description: 'Explore the best of Guangzhou',
      meeting_point: 'Canton Tower',
      gallery_asset_ids: ['https://example.com/tour1.jpg'],
    },
  ];

  for (const tour of tours) {
    await prisma.tour.create({
      data: tour,
    });
  }
  console.log('✓ Sample tours created');

  // Create sample transport products
  const transportProducts = [
    {
      city_id: guangzhou.id,
      type: 'pickup',
      base_price: 150,
      currency: 'CNY',
      rules: {
        max_passengers: 4,
        max_luggage: 2,
      },
    },
    {
      city_id: guangzhou.id,
      type: 'point_to_point',
      base_price: 100,
      currency: 'CNY',
      rules: {
        max_passengers: 4,
      },
    },
  ];

  for (const transport of transportProducts) {
    await prisma.transportProduct.create({
      data: transport,
    });
  }
  console.log('✓ Sample transport products created');

  // Create sample eSIM plans
  const esimPlans = [
    {
      name: 'China 5GB - 7 Days',
      provider: 'Airalo',
      region_text: 'China Mainland',
      data_text: '5GB high-speed data',
      validity_days: 7,
      price: 89,
      currency: 'CNY',
      is_active: true,
    },
    {
      name: 'China 10GB - 15 Days',
      provider: 'Airalo',
      region_text: 'China Mainland',
      data_text: '10GB high-speed data',
      validity_days: 15,
      price: 149,
      currency: 'CNY',
      is_active: true,
    },
    {
      name: 'Asia Regional 20GB - 30 Days',
      provider: 'Airalo',
      region_text: 'Asia (China, Japan, Korea, etc.)',
      data_text: '20GB high-speed data',
      validity_days: 30,
      price: 299,
      currency: 'CNY',
      is_active: true,
    },
  ];

  for (const plan of esimPlans) {
    await prisma.esimPlan.create({
      data: plan,
    });
  }
  console.log('✓ Sample eSIM plans created');

  // Create sample homepage blocks
  const homepageBlocks = [
    {
      type: 'offer_strip',
      title: 'New: Guangzhou launch promo — airport pickup discount',
      subtitle: null,
      payload: { link: '/services/transport' },
      is_active: true,
      sort_order: 1,
    },
    {
      type: 'promo_card',
      title: 'Featured Hotel',
      subtitle: 'Guangzhou Marriott Hotel',
      payload: {
        image: null,
        price: 'From ¥500/night',
        badge: 'Popular',
        actionText: 'Book Now',
        action: '/services/hotel',
      },
      is_active: true,
      sort_order: 1,
    },
    {
      type: 'promo_card',
      title: 'Emergency Medical Help',
      subtitle: '24/7 English-speaking support',
      payload: {
        image: null,
        price: null,
        badge: '24/7',
        actionText: 'Get Help',
        action: '/services/medical',
      },
      is_active: true,
      sort_order: 2,
    },
  ];

  for (const block of homepageBlocks) {
    await prisma.homepageBlock.create({
      data: block,
    });
  }
  console.log('✓ Homepage blocks created');

  console.log('\n✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

