import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function migrateGuideProfiles() {
  try {
    console.log('Starting guide_profiles migration...');

    // Step 1: Add id column as nullable (using raw SQL)
    console.log('Step 1: Adding id column...');
    await prisma.$executeRaw`
      ALTER TABLE guide_profiles 
      ADD COLUMN IF NOT EXISTS id TEXT;
    `;

    // Step 2: Populate id for existing rows
    console.log('Step 2: Populating id for existing rows...');
    const guides = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT user_id FROM guide_profiles WHERE id IS NULL;
    `;

    for (const guide of guides) {
      const newId = randomUUID();
      await prisma.$executeRaw`
        UPDATE guide_profiles 
        SET id = ${newId} 
        WHERE user_id = ${guide.user_id};
      `;
      console.log(`  Updated guide with user_id ${guide.user_id} -> id ${newId}`);
    }

    // Step 3: Make id NOT NULL
    console.log('Step 3: Making id NOT NULL...');
    await prisma.$executeRaw`
      ALTER TABLE guide_profiles 
      ALTER COLUMN id SET NOT NULL;
    `;

    // Step 4: Drop the old primary key constraint on user_id
    console.log('Step 4: Dropping old primary key...');
    await prisma.$executeRaw`
      ALTER TABLE guide_profiles 
      DROP CONSTRAINT IF EXISTS guide_profiles_pkey;
    `;

    // Step 5: Add primary key on id
    console.log('Step 5: Adding primary key on id...');
    await prisma.$executeRaw`
      ALTER TABLE guide_profiles 
      ADD CONSTRAINT guide_profiles_pkey PRIMARY KEY (id);
    `;

    // Step 6: Make user_id nullable and add unique constraint
    console.log('Step 6: Making user_id nullable and unique...');
    await prisma.$executeRaw`
      ALTER TABLE guide_profiles 
      ALTER COLUMN user_id DROP NOT NULL;
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS guide_profiles_user_id_key 
      ON guide_profiles(user_id) 
      WHERE user_id IS NOT NULL;
    `;

    // Step 7: Add index on user_id if it doesn't exist
    console.log('Step 7: Adding index on user_id...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS guide_profiles_user_id_idx 
      ON guide_profiles(user_id);
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateGuideProfiles();

