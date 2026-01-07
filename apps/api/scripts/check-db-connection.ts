/**
 * Check current database connection details
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConnection() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Get connection info from Prisma
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.log('❌ DATABASE_URL not found in environment variables');
      console.log('   Check apps/api/.env file');
      return;
    }

    // Parse connection string (hide password)
    const url = new URL(connectionString.replace('postgresql://', 'http://'));
    const dbName = url.pathname.replace('/', '');
    const schema = url.searchParams.get('schema') || 'public';
    
    console.log('📊 Database Connection Details:');
    console.log('   Host:', url.hostname);
    console.log('   Port:', url.port || '5432 (default)');
    console.log('   Database:', dbName);
    console.log('   Schema:', schema);
    console.log('   User:', url.username);
    console.log('   Password:', url.password ? '***' : '(not set)');
    
    // Test connection
    console.log('\n🔌 Testing connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!');
    
    // Get database info
    console.log('\n📋 Database Information:');
    const dbInfo = await prisma.$queryRaw<Array<{current_database: string, current_schema: string}>>`
      SELECT current_database(), current_schema()
    `;
    if (dbInfo.length > 0) {
      console.log('   Current Database:', dbInfo[0].current_database);
      console.log('   Current Schema:', dbInfo[0].current_schema);
    }
    
    // Count tables
    const tableCount = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ${schema}
    `;
    console.log('   Tables in schema:', tableCount[0]?.count || 0);
    
    // List some tables
    const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${schema}
      ORDER BY table_name
      LIMIT 10
    `;
    if (tables.length > 0) {
      console.log('\n   Sample tables:');
      tables.forEach(t => console.log('     -', t.table_name));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('P1001')) {
      console.error('   Cannot reach database server. Check:');
      console.error('   - Is PostgreSQL running?');
      console.error('   - Is DATABASE_URL correct?');
      console.error('   - Is the database server accessible?');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();









