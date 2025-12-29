/**
 * Check actual external_catalog_items table structure
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTable() {
  console.log('🔍 Checking external_catalog_items table structure...\n');

  try {
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'external_catalog_items'
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

    console.log('\n📋 Prisma schema expects:');
    console.log('   - id, source, external_id, title, price_min, price_max');
    console.log('   - currency, main_images, skus_json, seller_json');
    console.log('   - source_url, raw_json, last_synced_at, expires_at, title_en');
    console.log('   - NO created_at or updated_at');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();

