import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';

import { prisma } from './lib/prisma.js';
import { authenticate } from './middleware/auth.js';
import publicRoutes from './routes/public.shopping.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import sellerRoutes from './routes/seller.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

fastify.decorate('authenticate', authenticate);

await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [
      process.env.APP_BASE_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://bridgechina-web.vercel.app',
      'https://www.chinabuybd.com',
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    ];

    const isVercelPreview = origin && /^https:\/\/bridgechina-web-.*\.vercel\.app$/.test(origin);

    if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
});

await fastify.register(cookie, {
  secret: process.env.JWT_REFRESH_SECRET || 'change-me',
});

await fastify.register(formbody);

await fastify.register(multipart, {
  limits: {
    fileSize: 1024 * 1024,
  },
});

await fastify.register(jwt, {
  secret: process.env.JWT_ACCESS_SECRET || 'change-me',
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

fastify.get('/', async () => ({
  message: 'BridgeChina API',
  version: '2.0.0',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

await fastify.register(publicRoutes, { prefix: '/api/public' });
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(userRoutes, { prefix: '/api/user' });
await fastify.register(sellerRoutes, { prefix: '/api/seller' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await fastify.close();
    await prisma.$disconnect();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  fastify.log.error({ err: error }, 'Uncaught Exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  fastify.log.error({ err, promise: String(promise) }, 'Unhandled Rejection');
  shutdown('unhandledRejection');
});
