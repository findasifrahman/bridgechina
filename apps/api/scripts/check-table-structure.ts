/**
 * Check actual database table structure vs Prisma schema
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTableStructure() {
  console.log('🔍 Checking external_hot_items table structure...\n');

  try {
    // Get actual columns from database
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'external_hot_items'
      ORDER BY ordinal_position
    `;

    console.log('📊 Actual columns in database:');
    if (columns.length === 0) {
      console.log('   ❌ Table external_hot_items does not exist!');
    } else {
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }

    // Check Prisma schema expectations
    console.log('\n📋 Prisma schema expects:');
    console.log('   - id (String, PK)');
    console.log('   - source (String)');
    console.log('   - external_id (String)');
    console.log('   - is_pinned (Boolean, default: false)');
    console.log('   - sort_order (Int, default: 0)');
    console.log('   - created_at (DateTime)');
    console.log('   - updated_at (DateTime)');

    // Check if is_pinned exists
    const hasIsPinned = columns.some(c => c.column_name === 'is_pinned');
    if (!hasIsPinned) {
      console.log('\n⚠️  Missing column: is_pinned');
      console.log('   Need to add this column to the database');
    }

    // Check if sort_order exists
    const hasSortOrder = columns.some(c => c.column_name === 'sort_order');
    if (!hasSortOrder) {
      console.log('\n⚠️  Missing column: sort_order');
      console.log('   Need to add this column to the database');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();





