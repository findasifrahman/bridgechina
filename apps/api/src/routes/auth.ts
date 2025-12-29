import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { registerSchema, loginSchema } from '@bridgechina/shared';

const prisma = new PrismaClient();

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);
    
    const passwordHash = await argon2.hash(body.password);
    
    const user = await prisma.user.create({
      data: {
        email: body.email || null,
        phone: body.phone || null,
        password_hash: passwordHash,
        roles: {
          create: {
            role: {
              connect: {
                name: 'USER',
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const accessToken = fastify.jwt.sign(
      { id: user.id, email: user.email, phone: user.phone },
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '12h' }
    );

    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || '14d' }
    );

    const refreshTokenHash = await argon2.hash(refreshToken);
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60, // 14 days
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  });

  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          body.email ? { email: body.email } : {},
          body.phone ? { phone: body.phone } : {},
        ],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      reply.status(401).send({ error: 'Invalid credentials' });
      return;
    }

    const valid = await argon2.verify(user.password_hash, body.password);
    if (!valid) {
      reply.status(401).send({ error: 'Invalid credentials' });
      return;
    }

    const accessToken = fastify.jwt.sign(
      { id: user.id, email: user.email, phone: user.phone },
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '12h' }
    );

    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || '14d' }
    );

    const refreshTokenHash = await argon2.hash(refreshToken);
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  });

  // Refresh token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    
    if (!refreshToken) {
      reply.status(401).send({ error: 'No refresh token' });
      return;
    }

    try {
      const decoded = fastify.jwt.verify(refreshToken) as { id: string };
      
      const tokens = await prisma.refreshToken.findMany({
        where: {
          user_id: decoded.id,
          expires_at: {
            gt: new Date(),
          },
        },
      });

      let validToken = null;
      for (const token of tokens) {
        try {
          const isValid = await argon2.verify(token.token_hash, refreshToken);
          if (isValid) {
            validToken = token;
            break;
          }
        } catch {
          // Continue checking other tokens
        }
      }

      if (!validToken) {
        reply.status(401).send({ error: 'Invalid refresh token' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || user.status !== 'active') {
        reply.status(401).send({ error: 'User not found or inactive' });
        return;
      }

      // Rotate refresh token
      await prisma.refreshToken.delete({
        where: { id: validToken.id },
      });

      const newRefreshToken = fastify.jwt.sign(
        { id: user.id },
        { expiresIn: process.env.JWT_REFRESH_EXPIRES || '14d' }
      );

      const newRefreshTokenHash = await argon2.hash(newRefreshToken);
      await prisma.refreshToken.create({
        data: {
          user_id: user.id,
          token_hash: newRefreshTokenHash,
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email, phone: user.phone },
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '12h' }
      );

      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          roles: user.roles.map((ur) => ur.role.name),
        },
      };
    } catch (err) {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = fastify.jwt.verify(refreshToken) as { id: string };
        await prisma.refreshToken.deleteMany({
          where: {
            user_id: decoded.id,
          },
        });
      } catch {
        // Ignore errors
      }
    }

    reply.clearCookie('refreshToken');
    return { message: 'Logged out' };
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate as any],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((ur) => ur.role.name),
    };
  });
}

// Extend FastifyInstance to include authenticate
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

