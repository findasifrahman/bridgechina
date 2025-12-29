import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function userRoutes(fastify: FastifyInstance) {
  // Get user's service requests
  fastify.get('/requests', {
    preHandler: [fastify.authenticate as any],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const requests = await prisma.serviceRequest.findMany({
      where: { user_id: req.user.id },
      include: {
        category: true,
        city: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return requests;
  });

  // Get user's orders
  fastify.get('/orders', {
    preHandler: [fastify.authenticate as any],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const orders = await prisma.order.findMany({
      where: { user_id: req.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return orders;
  });

  // Get user's addresses
  fastify.get('/addresses', {
    preHandler: [fastify.authenticate as any],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const addresses = await prisma.address.findMany({
      where: { user_id: req.user.id },
      include: { city: true },
      orderBy: { created_at: 'desc' },
    });
    return addresses;
  });
}

