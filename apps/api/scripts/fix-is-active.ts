/**
 * Script to check and fix is_active fields in database
 * This helps identify why data isn't showing up
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndFix() {
  console.log('🔍 Checking is_active fields in database...\n');

  try {
    // Check city_places
    const allCityPlaces = await prisma.cityPlace.findMany({});
    const activeCityPlaces = await prisma.cityPlace.findMany({
      where: { is_active: true },
    });
    
    console.log(`📍 City Places:`);
    console.log(`   Total: ${allCityPlaces.length}`);
    console.log(`   Active (is_active = true): ${activeCityPlaces.length}`);
    console.log(`   Inactive: ${allCityPlaces.length - activeCityPlaces.length}`);
    
    if (allCityPlaces.length > activeCityPlaces.length) {
      console.log('\n   ⚠️  Found inactive city places:');
      allCityPlaces
        .filter(p => !p.is_active)
        .forEach(p => {
          console.log(`      - ${p.name} (id: ${p.id}, is_active: ${p.is_active})`);
        });
      
      console.log('\n   💡 To fix, run:');
      console.log('      UPDATE city_places SET is_active = true WHERE is_active = false OR is_active IS NULL;');
    }

    // Check featured_items
    const allFeatured = await prisma.featuredItem.findMany({});
    const activeFeatured = await prisma.featuredItem.findMany({
      where: { is_active: true },
    });
    
    console.log(`\n⭐ Featured Items:`);
    console.log(`   Total: ${allFeatured.length}`);
    console.log(`   Active: ${activeFeatured.length}`);
    console.log(`   Inactive: ${allFeatured.length - activeFeatured.length}`);

    // Check offers
    const allOffers = await prisma.serviceBasedOffer.findMany({});
    const activeOffers = await prisma.serviceBasedOffer.findMany({
      where: { is_active: true },
    });
    
    console.log(`\n🎁 Service Offers:`);
    console.log(`   Total: ${allOffers.length}`);
    console.log(`   Active: ${activeOffers.length}`);
    console.log(`   Inactive: ${allOffers.length - activeOffers.length}`);

    // Check banners
    const allBanners = await prisma.homepageBanner.findMany({});
    const activeBanners = await prisma.homepageBanner.findMany({
      where: { is_active: true },
    });
    
    console.log(`\n🖼️  Homepage Banners:`);
    console.log(`   Total: ${allBanners.length}`);
    console.log(`   Active: ${activeBanners.length}`);
    console.log(`   Inactive: ${allBanners.length - activeBanners.length}`);

    // Check hotels
    const allHotels = await prisma.hotel.findMany({});
    const verifiedHotels = await prisma.hotel.findMany({
      where: { verified: true },
    });
    
    console.log(`\n🏨 Hotels:`);
    console.log(`   Total: ${allHotels.length}`);
    console.log(`   Verified: ${verifiedHotels.length}`);
    console.log(`   Unverified: ${allHotels.length - verifiedHotels.length}`);

    console.log('\n✅ Check complete!');
    console.log('\n💡 If you see inactive items, you can:');
    console.log('   1. Update them in Prisma Studio: pnpm --filter @bridgechina/api db:studio');
    console.log('   2. Or run SQL: UPDATE table_name SET is_active = true WHERE is_active = false;');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFix();

