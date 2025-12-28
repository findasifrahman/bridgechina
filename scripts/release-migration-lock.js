/**
 * Script to release Prisma migration advisory locks
 * Usage: node scripts/release-migration-lock.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function releaseLocks() {
  try {
    console.log('Connecting to database...');
    
    // Prisma uses advisory lock 72707369 for migrations
    // We'll try to release all advisory locks held by this session
    const result = await prisma.$executeRawUnsafe(`
      SELECT pg_advisory_unlock_all();
    `);
    
    console.log('✅ Released all advisory locks for this session');
    console.log('You can now retry the migration with: pnpm db:migrate');
    
    // Also check for any active locks
    const locks = await prisma.$queryRawUnsafe(`
      SELECT 
        locktype,
        objid,
        pid,
        mode,
        granted
      FROM pg_locks
      WHERE locktype = 'advisory'
      AND objid = 72707369;
    `);
    
    if (locks && locks.length > 0) {
      console.log('\n⚠️  Warning: There are still active advisory locks:');
      console.log(JSON.stringify(locks, null, 2));
      console.log('\nYou may need to:');
      console.log('1. Kill the process holding the lock (PID shown above)');
      console.log('2. Restart PostgreSQL service');
      console.log('3. Or wait a few minutes and retry');
    } else {
      console.log('\n✅ No active locks found. Safe to proceed with migration.');
    }
    
  } catch (error) {
    console.error('❌ Error releasing locks:', error.message);
    console.log('\nAlternative solutions:');
    console.log('1. Restart PostgreSQL service');
    console.log('2. Wait 1-2 minutes and retry the migration');
    console.log('3. Manually connect to PostgreSQL and run: SELECT pg_advisory_unlock_all();');
  } finally {
    await prisma.$disconnect();
  }
}

releaseLocks();

