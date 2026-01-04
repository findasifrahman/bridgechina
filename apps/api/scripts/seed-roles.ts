/**
 * Seed Roles Script
 * Adds all required roles to the database, including SERVICE_PROVIDER
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding roles...');

  // Define all roles with proper spelling
  const roles = [
    'ADMIN',
    'OPS',
    'EDITOR',
    'SELLER',
    'PARTNER',
    'USER',
    'SERVICE_PROVIDER', // Proper spelling with underscore
  ];

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {}, // Don't update if exists
      create: { name: roleName },
    });
    console.log(`✓ Role "${roleName}" ${role.createdAt ? 'created' : 'already exists'}`);
  }

  console.log('✓ All roles seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding roles:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

