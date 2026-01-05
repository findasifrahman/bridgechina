import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    roles: string[];
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: string; email?: string; phone?: string };
    
    // Fetch user roles from database
    
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    (request as any).user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((ur) => ur.role.name),
    };
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    if (!req.user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const hasRole = req.user.roles.some((role: string) => allowedRoles.includes(role));
    if (!hasRole) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  };
}

