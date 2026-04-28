import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = ['CUSTOMER', 'SELLER', 'ADMIN'];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seeded default roles:', roles.join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
