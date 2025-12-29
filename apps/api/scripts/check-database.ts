/**
 * Quick script to check if database has data and Prisma can access it
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database...\n');

  try {
    // Check featured items
    const featuredItems = await prisma.featuredItem.findMany({
      where: { is_active: true },
      take: 5,
    });
    console.log(`✅ Featured Items: ${featuredItems.length} active items found`);
    if (featuredItems.length > 0) {
      console.log('   Sample:', featuredItems[0]);
    }

    // Check offers
    const offers = await prisma.serviceBasedOffer.findMany({
      where: { is_active: true },
      take: 5,
    });
    console.log(`✅ Service Offers: ${offers.length} active offers found`);
    if (offers.length > 0) {
      console.log('   Sample:', offers[0]);
    }

    // Check banners
    const banners = await prisma.homepageBanner.findMany({
      where: { is_active: true },
      take: 5,
    });
    console.log(`✅ Homepage Banners: ${banners.length} active banners found`);
    if (banners.length > 0) {
      console.log('   Sample:', banners[0]);
    }

    // Check hotels
    const hotels = await prisma.hotel.findMany({
      where: { verified: true },
      take: 5,
    });
    console.log(`✅ Hotels: ${hotels.length} verified hotels found`);
    if (hotels.length > 0) {
      console.log('   Sample:', { id: hotels[0].id, name: hotels[0].name });
    }

    // Check media assets
    const mediaAssets = await prisma.mediaAsset.findMany({
      take: 5,
    });
    console.log(`✅ Media Assets: ${mediaAssets.length} assets found`);
    if (mediaAssets.length > 0) {
      console.log('   Sample:', { id: mediaAssets[0].id, public_url: mediaAssets[0].public_url });
    }

    // Test homepage query
    console.log('\n📊 Testing homepage query...');
    const city = await prisma.city.findFirst({
      where: { slug: 'guangzhou', is_active: true },
    });
    
    if (city) {
      console.log(`✅ City found: ${city.name} (${city.id})`);
      
      const cityHotels = await prisma.hotel.findMany({
        where: { city_id: city.id, verified: true },
        include: { city: true, coverAsset: true },
        take: 4,
      });
      console.log(`✅ Hotels for ${city.name}: ${cityHotels.length} found`);
    } else {
      console.log('⚠️  Guangzhou city not found, checking any active city...');
      const anyCity = await prisma.city.findFirst({
        where: { is_active: true },
      });
      if (anyCity) {
        console.log(`✅ Found city: ${anyCity.name} (${anyCity.slug})`);
      } else {
        console.log('❌ No active cities found');
      }
    }

    console.log('\n✅ Database check complete!');
  } catch (error: any) {
    console.error('❌ Error checking database:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

