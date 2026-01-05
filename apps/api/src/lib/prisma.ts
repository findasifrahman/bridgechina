import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple PrismaClient instances
// This ensures we only have one connection pool across the entire application

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create PrismaClient with connection pooling configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    // These settings help prevent "too many connections" errors
    // Prisma automatically manages connection pooling, but we can optimize it
  });
};

// Use global variable in development to prevent multiple instances during hot reload
// In production, this will be a single instance
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;



