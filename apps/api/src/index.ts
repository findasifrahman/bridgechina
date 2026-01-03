import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { authenticate } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import sellerRoutes from './routes/seller.js';
import userRoutes from './routes/user.js';
import guideRoutes from './routes/guide.js';
import opsRoutes from './routes/ops.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [
      process.env.APP_BASE_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://bridgechina-web.vercel.app',
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    ];
    
    // Allow all Vercel preview deployments (bridgechina-web-*.vercel.app)
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
    fileSize: 1024 * 1024, // 1MB max
  },
});

await fastify.register(jwt, {
  secret: process.env.JWT_ACCESS_SECRET || 'change-me',
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Register authenticate middleware
fastify.decorate('authenticate', authenticate);

// Root route
fastify.get('/', async () => {
  return {
    message: 'BridgeChina API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      public: '/api/public',
      user: '/api/user',
      admin: '/api/admin',
      seller: '/api/seller',
      guide: '/api/guide',
    },
  };
});

// API info route
fastify.get('/api', async () => {
  return {
    message: 'BridgeChina API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      public: '/api/public',
      user: '/api/user',
      admin: '/api/admin',
      seller: '/api/seller',
      guide: '/api/guide',
    },
  };
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(publicRoutes, { prefix: '/api/public' });
await fastify.register(userRoutes, { prefix: '/api/user' });
await fastify.register(guideRoutes, { prefix: '/api/guide' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(sellerRoutes, { prefix: '/api/seller' });
await fastify.register(opsRoutes, { prefix: '/api/ops' });
await fastify.register(whatsappRoutes, { prefix: '/api/webhooks/twilio/whatsapp' });

// Error handler
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

// Graceful shutdown
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

// Handle different shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C on Windows

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error({ err: error }, 'Uncaught Exception');
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  fastify.log.error({ err, promise: String(promise) }, 'Unhandled Rejection');
  shutdown('unhandledRejection');
});

