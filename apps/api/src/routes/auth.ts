import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import argon2 from 'argon2';
import { registerSchema, loginSchema } from '@bridgechina/shared';
import { randomInt, randomUUID } from 'crypto';
import { z } from 'zod';
import { isMailerConfigured, sendMail } from '../utils/mailer.js';

const authRateLimit = {
  max: 5,
  timeWindow: '1 minute',
};

const emailCodeRateLimit = {
  max: 3,
  timeWindow: '5 minutes',
};

const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' });

const emailCodeRequestSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['auth', 'password_reset']).default('auth'),
});

const emailCodeVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const passwordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: passwordSchema,
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createOtpCode() {
  return String(randomInt(100000, 1000000));
}

async function createAuthResponse(fastify: FastifyInstance, reply: FastifyReply, user: any) {
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
      roles: user.roles.map((ur: any) => ur.role.name),
    },
  };
}

async function sendOtpEmail(email: string, code: string, purpose: 'auth' | 'password_reset') {
  const label = purpose === 'password_reset' ? 'password reset' : 'sign in';
  await sendMail({
    to: email,
    subject: `Your ChinaBuyBD ${label} code`,
    text: `Your ChinaBuyBD ${label} code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ChinaBuyBD ${label} code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
}

async function createAndSendOtp(email: string, purpose: 'auth' | 'password_reset') {
  if (!isMailerConfigured()) {
    throw new Error('Email sending is not configured');
  }

  const code = createOtpCode();
  await prisma.$executeRaw`
    INSERT INTO auth_email_otps (id, email, purpose, code_hash, expires_at)
    VALUES (${randomUUID()}, ${email}, ${purpose}, ${await argon2.hash(code)}, ${new Date(Date.now() + 10 * 60 * 1000)})
  `;
  await sendOtpEmail(email, code, purpose);
}

async function consumeValidOtp(email: string, purpose: 'auth' | 'password_reset', code: string) {
  const rows = await prisma.$queryRaw`
    SELECT id, code_hash
    FROM auth_email_otps
    WHERE email = ${email}
      AND purpose = ${purpose}
      AND consumed_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  ` as Array<{ id: string; code_hash: string }>;
  const otp = rows[0];

  if (!otp || !(await argon2.verify(otp.code_hash, code))) {
    return false;
  }

  await prisma.$executeRaw`
    UPDATE auth_email_otps
    SET consumed_at = NOW()
    WHERE id = ${otp.id}
  `;
  return true;
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);
    const passwordHash = await argon2.hash(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email || null,
        phone: body.phone || null,
        password_hash: passwordHash,
        status: 'active',
        roles: {
          create: {
            role: {
              connect: { name: 'CUSTOMER' },
            },
          },
        },
        customerProfile: {
          create: {
            preferred_currency: 'BDT',
          },
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return createAuthResponse(fastify, reply, user);
  });

  fastify.post('/login', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    const where = body.email
      ? { email: body.email }
      : body.phone
        ? { phone: body.phone }
        : null;

    if (!where) {
      reply.status(400).send({ error: 'Email or phone is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where,
      include: {
        roles: {
          include: { role: true },
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

    return createAuthResponse(fastify, reply, user);
  });

  fastify.post('/email-code/request', {
    config: {
      rateLimit: emailCodeRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = emailCodeRequestSchema.parse(request.body);
    const email = normalizeEmail(body.email);

    if (body.purpose === 'password_reset') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return { message: 'If an account exists for this email, a code has been sent.' };
      }
    }

    try {
      await createAndSendOtp(email, body.purpose);
    } catch (error: any) {
      request.log.error({ err: error }, '[Auth] Failed to send email code');
      return reply.status(500).send({ error: error.message || 'Failed to send email code' });
    }

    return { message: 'Verification code sent' };
  });

  fastify.post('/email-code/verify', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = emailCodeVerifySchema.parse(request.body);
    const email = normalizeEmail(body.email);
    const valid = await consumeValidOtp(email, 'auth', body.code);
    if (!valid) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone: body.phone?.trim() || null,
          password_hash: await argon2.hash(randomUUID()),
          status: 'active',
          roles: {
            create: {
              role: {
                connect: { name: 'CUSTOMER' },
              },
            },
          },
          customerProfile: {
            create: {
              full_name: body.name || null,
              preferred_currency: 'BDT',
            },
          },
        },
        include: { roles: { include: { role: true } } },
      });
    }

    if (user.status !== 'active') {
      return reply.status(403).send({ error: 'Account is not active' });
    }

    return createAuthResponse(fastify, reply, user);
  });

  fastify.post('/password-reset/request', {
    config: {
      rateLimit: emailCodeRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ email: z.string().email() }).parse(request.body);
    const email = normalizeEmail(body.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If an account exists for this email, a code has been sent.' };
    }

    try {
      await createAndSendOtp(email, 'password_reset');
    } catch (error: any) {
      request.log.error({ err: error }, '[Auth] Failed to send password reset code');
      return reply.status(500).send({ error: error.message || 'Failed to send password reset code' });
    }

    return { message: 'Password reset code sent' };
  });

  fastify.post('/password-reset/confirm', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = passwordResetConfirmSchema.parse(request.body);
    const email = normalizeEmail(body.email);
    const valid = await consumeValidOtp(email, 'password_reset', body.code);
    if (!valid) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    const user = await prisma.user.update({
      where: { email },
      data: { password_hash: await argon2.hash(body.password) },
      include: { roles: { include: { role: true } } },
    });

    return createAuthResponse(fastify, reply, user);
  });

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
          expires_at: { gt: new Date() },
        },
      });

      let validToken = null as null | { id: string };
      for (const token of tokens) {
        try {
          const isValid = await argon2.verify(token.token_hash, refreshToken);
          if (isValid) {
            validToken = token;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!validToken) {
        reply.status(401).send({ error: 'Invalid refresh token' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          roles: { include: { role: true } },
        },
      });

      if (!user || user.status !== 'active') {
        reply.status(401).send({ error: 'User not found or inactive' });
        return;
      }

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
    } catch {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = fastify.jwt.verify(refreshToken) as { id: string };
        await prisma.refreshToken.deleteMany({
          where: { user_id: decoded.id },
        });
      } catch {
        // ignore
      }
    }

    reply.clearCookie('refreshToken');
    return { message: 'Logged out' };
  });

  fastify.get('/me', {
    preHandler: [fastify.authenticate as any],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: { role: true },
        },
        customerProfile: true,
        sellerProfile: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((ur) => ur.role.name),
      customerProfile: user.customerProfile,
      sellerProfile: user.sellerProfile,
    };
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
