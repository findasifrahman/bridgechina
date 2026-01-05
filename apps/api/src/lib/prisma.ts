import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple PrismaClient instances
// This ensures we only have one connection pool across the entire application

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create PrismaClient with connection pooling configuration
// Note: Connection pool settings should be in DATABASE_URL (e.g., ?connection_limit=10)
// Railway provides pooled connection URLs - use those in production
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Use global variable in development to prevent multiple instances during hot reload
// In production, this will be a single instance
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown - properly disconnect on process termination
const gracefulShutdown = async () => {
  await prisma.$disconnect();
};

process.on('beforeExit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default prisma;



