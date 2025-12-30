/**
 * Check actual homepage_banners table structure
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTable() {
  console.log('🔍 Checking homepage_banners table structure...\n');

  try {
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'homepage_banners'
      ORDER BY ordinal_position
    `;

    console.log('📊 Actual columns in database:');
    if (columns.length === 0) {
      console.log('   ❌ Table does not exist!');
    } else {
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }

    // Try to query some data
    console.log('\n📋 Sample data:');
    const banners = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM homepage_banners LIMIT 3
    `;
    if (banners.length > 0) {
      console.log('   Found', banners.length, 'banners');
      console.log('   Sample:', JSON.stringify(banners[0], null, 2));
    } else {
      console.log('   No banners found in database');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();




