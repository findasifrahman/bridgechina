import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import argon2 from 'argon2';
import { registerSchema, loginSchema } from '@bridgechina/shared';
import { randomInt, randomUUID } from 'crypto';
import { z } from 'zod';
import { isMailerConfigured, mailerConfigStatus, sendMail } from '../utils/mailer.js';
import { isSmsConfigured, normalizeSmsBdPhone, sendSmsBdOtp } from '../utils/sms-bd.js';

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

const phoneCodeRequestSchema = z.object({
  phone: z.string().min(10),
  purpose: z.enum(['auth']).default('auth'),
  intent: z.enum(['login', 'register']).default('login'),
});

const phoneCodeVerifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().regex(/^\d{4}$/),
  intent: z.enum(['login', 'register']).default('login'),
  name: z.string().min(2).optional(),
  password: z.string().min(4).max(128).optional(),
});

const passwordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: passwordSchema,
});

type AuthIntent = 'login' | 'register';

type GoogleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

class DuplicateAccountError extends Error {
  constructor(public field: 'email' | 'phone') {
    super(
      field === 'email'
        ? 'This email is already registered. Please sign in instead.'
        : 'This phone number is already registered. Please sign in with your password.'
    );
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeBangladeshPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('01') && digits.length === 11) return `+88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `+880${digits}`;
  return phone.trim();
}

function normalizeAuthIntent(value: unknown): AuthIntent {
  return value === 'register' ? 'register' : 'login';
}

function isUniqueConstraintError(error: any) {
  return error?.code === 'P2002';
}

async function findExistingAccountByEmailOrPhone(email?: string | null, phones: string[] = []) {
  const or: Array<{ email?: string; phone?: string }> = [];
  if (email) or.push({ email });
  phones.forEach((phone) => or.push({ phone }));
  if (or.length === 0) return null;
  return prisma.user.findFirst({
    where: { OR: or },
    select: { id: true, email: true, phone: true },
  });
}

async function accountAuthMethods(userId: string) {
  const oauthRows = await prisma.$queryRaw`
    SELECT provider
    FROM oauth_accounts
    WHERE user_id = ${userId}
  ` as Array<{ provider: string }>;
  const providers = Array.from(new Set(oauthRows.map((row) => row.provider).filter(Boolean)));
  const google = providers.includes('google');
  return {
    google,
    password: !google,
    providers,
  };
}

async function duplicateEmailResponse(reply: FastifyReply, userId: string) {
  const authMethods = await accountAuthMethods(userId);
  const error = authMethods.google && !authMethods.password
    ? 'This email is already registered with Google. Please sign in with Google to continue.'
    : authMethods.google
      ? 'This email is already registered. Please sign in with Google or your password to continue.'
      : 'This email is already registered. Please sign in with your email and password to continue.';

  return reply.status(409).send({
    code: authMethods.google ? 'EMAIL_REGISTERED_WITH_GOOGLE' : 'EMAIL_REGISTERED_WITH_PASSWORD',
    error,
    authMethods,
  });
}

function uniquePhoneCandidates(rawPhone?: string | null) {
  if (!rawPhone) return [];
  return Array.from(new Set([normalizeBangladeshPhone(rawPhone), rawPhone.trim()].filter(Boolean)));
}

function webAppBaseUrl() {
  return (process.env.WEB_APP_URL || process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function apiBaseUrl(request: FastifyRequest) {
  return (process.env.API_BASE_URL || `${request.protocol}://${request.hostname}`).replace(/\/+$/, '');
}

function googleRedirectUri(request: FastifyRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${apiBaseUrl(request)}/api/auth/google/callback`;
}

function sanitizeRedirectPath(value: unknown) {
  const redirect = typeof value === 'string' ? value : '/user';
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/user';
  return redirect;
}

function createOtpCode() {
  return String(randomInt(100000, 1000000));
}

function createPhoneOtpCode() {
  return String(randomInt(1000, 10000));
}

function phoneAlreadyRegisteredResponse(reply: FastifyReply) {
  return reply.status(409).send({
    code: 'PHONE_ALREADY_REGISTERED',
    error: 'This phone number is already registered. Sign in with your password or phone OTP to continue.',
    authMethods: { password: true, phoneOtp: true },
  });
}

async function activeOtpBlock(channel: string, identifier: string) {
  const rows = await prisma.$queryRaw`
    SELECT blocked_until
    FROM auth_otp_blocks
    WHERE channel = ${channel}
      AND identifier = ${identifier}
      AND blocked_until > NOW()
    ORDER BY blocked_until DESC
    LIMIT 1
  ` as Array<{ blocked_until: Date }>;
  return rows[0] || null;
}

async function blockOtp(channel: string, identifier: string, reason: string) {
  const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO auth_otp_blocks (id, channel, identifier, reason, blocked_until)
    VALUES (${randomUUID()}, ${channel}, ${identifier}, ${reason}, ${blockedUntil})
  `;
  return blockedUntil;
}

function otpBlockedMessage(blockedUntil: Date) {
  return `Too many OTP attempts. Please try again after ${blockedUntil.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}.`;
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
    console.error('[Auth] Email sending is not configured', mailerConfigStatus());
    throw new Error('Email sending is not configured');
  }

  const code = createOtpCode();
  await prisma.$executeRaw`
    INSERT INTO auth_email_otps (id, email, purpose, code_hash, expires_at)
    VALUES (${randomUUID()}, ${email}, ${purpose}, ${await argon2.hash(code)}, ${new Date(Date.now() + 10 * 60 * 1000)})
  `;
  await sendOtpEmail(email, code, purpose);
}

function emailCodeRequestErrorMessage(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === 'ENETUNREACH' || message.includes('ENETUNREACH')) {
    return 'Email service is temporarily unavailable. Please try again in a moment.';
  }
  if (code === 'ETIMEDOUT' || message.includes('timed out')) {
    return 'Email service timed out. Please log in with mobile OTP or google mail above';
  }
  return 'Failed to send email code';
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

async function fetchGoogleProfile(request: FastifyRequest, code: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: googleRedirectUri(request),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to verify Google login');
  }

  const tokenJson = await tokenResponse.json() as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Google login did not return an access token');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileResponse.ok) {
    throw new Error('Failed to read Google profile');
  }

  return profileResponse.json() as Promise<GoogleProfile>;
}

async function findOrCreateGoogleUser(profile: GoogleProfile, intent: AuthIntent) {
  if (!profile.sub || !profile.email || profile.email_verified === false) {
    throw new Error('Google account email is not verified');
  }

  const email = normalizeEmail(profile.email);

  if (intent === 'register') {
    const registeredUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (registeredUser) {
      throw new DuplicateAccountError('email');
    }
  }

  const oauthRows = await prisma.$queryRaw`
    SELECT user_id
    FROM oauth_accounts
    WHERE provider = 'google' AND provider_account_id = ${profile.sub}
    LIMIT 1
  ` as Array<{ user_id: string }>;

  if (oauthRows[0]?.user_id) {
    const existing = await prisma.user.findUnique({
      where: { id: oauthRows[0].user_id },
      include: { roles: { include: { role: true } } },
    });
    if (existing) return existing;
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        phone: null,
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
            full_name: profile.name || null,
            preferred_currency: 'BDT',
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });
  }

  await prisma.$executeRaw`
    INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id)
    VALUES (${randomUUID()}, ${user.id}, 'google', ${profile.sub})
    ON CONFLICT (provider, provider_account_id) DO NOTHING
  `;

  return user;
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/google/start', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return reply.status(500).send({ error: 'Google OAuth is not configured' });
    }

    const query = request.query as { redirect?: string; intent?: string };
    const state = randomUUID();
    const redirectPath = sanitizeRedirectPath(query.redirect);
    const intent = normalizeAuthIntent(query.intent);
    reply.setCookie('googleOAuthState', JSON.stringify({ state, redirectPath, intent }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/api/auth/google',
    });

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', googleRedirectUri(request));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    return reply.redirect(url.toString());
  });

  fastify.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const fallback = `${webAppBaseUrl()}/login?oauth=failed`;
    if (query.error || !query.code || !query.state) {
      return reply.redirect(fallback);
    }

    let stored: { state?: string; redirectPath?: string; intent?: string } = {};
    try {
      stored = JSON.parse(request.cookies.googleOAuthState || '{}');
    } catch {
      stored = {};
    }

    if (!stored.state || stored.state !== query.state) {
      return reply.redirect(fallback);
    }

    try {
      const profile = await fetchGoogleProfile(request, query.code);
      const user = await findOrCreateGoogleUser(profile, normalizeAuthIntent(stored.intent));
      if (user.status !== 'active') {
        return reply.redirect(`${webAppBaseUrl()}/login?oauth=blocked`);
      }

      const auth = await createAuthResponse(fastify, reply, user);
      reply.clearCookie('googleOAuthState', { path: '/api/auth/google' });
      const callbackUrl = new URL(`${webAppBaseUrl()}/auth/google/callback`);
      callbackUrl.hash = new URLSearchParams({
        accessToken: auth.accessToken,
        redirect: sanitizeRedirectPath(stored.redirectPath),
      }).toString();
      return reply.redirect(callbackUrl.toString());
    } catch (error: any) {
      if (error instanceof DuplicateAccountError) {
        reply.clearCookie('googleOAuthState', { path: '/api/auth/google' });
        return reply.redirect(`${webAppBaseUrl()}/login?oauth=already_registered&field=${error.field}`);
      }
      request.log.error({ err: error }, '[Auth] Google OAuth failed');
      return reply.redirect(fallback);
    }
  });

  fastify.post('/register', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);
    const email = body.email ? normalizeEmail(body.email) : null;
    const phone = body.phone ? normalizeBangladeshPhone(body.phone) : null;
    const phoneCandidates = uniquePhoneCandidates(body.phone);

    const existing = await findExistingAccountByEmailOrPhone(email, phoneCandidates);
    if (existing?.email && email && existing.email === email) {
      return duplicateEmailResponse(reply, existing.id);
    }
    if (existing?.phone && phoneCandidates.includes(existing.phone)) {
      return reply.status(409).send({ code: 'PHONE_ALREADY_REGISTERED', error: 'This phone number is already registered. Please sign in with your password.' });
    }

    const passwordHash = await argon2.hash(body.password);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          phone,
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
    } catch (error: any) {
      if (isUniqueConstraintError(error)) {
        return reply.status(409).send({ code: 'ACCOUNT_ALREADY_REGISTERED', error: 'This email or phone number is already registered. Please sign in instead.' });
      }
      throw error;
    }
  });

  fastify.post('/login', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    const where = body.email
      ? { email: normalizeEmail(body.email) }
      : body.phone
        ? { OR: uniquePhoneCandidates(body.phone).map((phone) => ({ phone })) }
        : null;

    if (!where || (body.phone && uniquePhoneCandidates(body.phone).length === 0)) {
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
    const body = emailCodeRequestSchema.extend({
      intent: z.enum(['login', 'register']).default('login'),
    }).parse(request.body);
    const email = normalizeEmail(body.email);

    if (body.intent === 'register') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        return duplicateEmailResponse(reply, user.id);
      }
    }

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
      return reply.status(500).send({ error: emailCodeRequestErrorMessage(error) });
    }

    return { message: 'Verification code sent' };
  });

  fastify.post('/email-code/verify', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = emailCodeVerifySchema.extend({
      intent: z.enum(['login', 'register']).default('login'),
    }).parse(request.body);
    const email = normalizeEmail(body.email);
    const valid = await consumeValidOtp(email, 'auth', body.code);
    if (!valid) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (body.intent === 'register' && user) {
      return reply.status(409).send({ code: 'EMAIL_ALREADY_REGISTERED', error: 'This email is already registered. Please sign in instead.' });
    }

    if (!user) {
      const phone = body.phone ? normalizeBangladeshPhone(body.phone) : null;
      if (phone) {
        const existingPhone = await prisma.user.findFirst({
          where: { OR: uniquePhoneCandidates(body.phone).map((candidate) => ({ phone: candidate })) },
          select: { id: true },
        });
        if (existingPhone) {
          return reply.status(409).send({ code: 'PHONE_ALREADY_REGISTERED', error: 'This phone number is already registered. Please sign in with your password.' });
        }
      }

      try {
        user = await prisma.user.create({
          data: {
            email,
            phone,
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
      } catch (error: any) {
        if (isUniqueConstraintError(error)) {
          return reply.status(409).send({ code: 'ACCOUNT_ALREADY_REGISTERED', error: 'This email or phone number is already registered. Please sign in instead.' });
        }
        throw error;
      }
    }

    if (user.status !== 'active') {
      return reply.status(403).send({ error: 'Account is not active' });
    }

    return createAuthResponse(fastify, reply, user);
  });

  fastify.post('/phone-code/request', {
    config: {
      rateLimit: emailCodeRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = phoneCodeRequestSchema.parse(request.body);
    const phone = normalizeBangladeshPhone(body.phone);
    const smsPhone = normalizeSmsBdPhone(phone);

    if (!/^8801[3-9]\d{8}$/.test(smsPhone)) {
      return reply.status(400).send({ error: 'Enter a valid Bangladesh mobile number' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: uniquePhoneCandidates(body.phone).map((candidate) => ({ phone: candidate })) },
      select: { id: true },
    });

    if (body.intent === 'register' && existingUser) {
      return phoneAlreadyRegisteredResponse(reply);
    }

    if (body.intent === 'login' && !existingUser) {
      return reply.status(404).send({ code: 'PHONE_NOT_REGISTERED', error: 'No account found for this phone number. Please register first.' });
    }

    const block = await activeOtpBlock('sms', smsPhone);
    if (block) {
      return reply.status(429).send({ code: 'OTP_BLOCKED', error: otpBlockedMessage(block.blocked_until) });
    }

    const sendRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM auth_phone_otps
      WHERE phone = ${smsPhone}
        AND created_at > NOW() - INTERVAL '24 hours'
    ` as Array<{ count: number }>;

    if (Number(sendRows[0]?.count || 0) >= 3) {
      const blockedUntil = await blockOtp('sms', smsPhone, 'daily_send_limit');
      return reply.status(429).send({ code: 'OTP_BLOCKED', error: otpBlockedMessage(blockedUntil) });
    }

    if (!isSmsConfigured()) {
      return reply.status(500).send({ error: 'SMS sending is not configured' });
    }

    const code = createPhoneOtpCode();
    await prisma.$executeRaw`
      INSERT INTO auth_phone_otps (id, phone, purpose, code_hash, expires_at)
      VALUES (${randomUUID()}, ${smsPhone}, ${body.purpose}, ${await argon2.hash(code)}, ${new Date(Date.now() + 60 * 1000)})
    `;

    try {
      await sendSmsBdOtp(smsPhone, code);
    } catch (error: any) {
      request.log.error({ err: error }, '[Auth] Failed to send phone OTP');
      return reply.status(500).send({ error: error.message || 'Failed to send SMS OTP' });
    }

    return { message: 'OTP sent', expiresInSeconds: 60 };
  });

  fastify.post('/phone-code/verify', {
    config: {
      rateLimit: authRateLimit,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = phoneCodeVerifySchema.parse(request.body);
    const phone = normalizeBangladeshPhone(body.phone);
    const smsPhone = normalizeSmsBdPhone(phone);

    const block = await activeOtpBlock('sms', smsPhone);
    if (block) {
      return reply.status(429).send({ code: 'OTP_BLOCKED', error: otpBlockedMessage(block.blocked_until) });
    }

    const rows = await prisma.$queryRaw`
      SELECT id, code_hash, attempts
      FROM auth_phone_otps
      WHERE phone = ${smsPhone}
        AND purpose = 'auth'
        AND consumed_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    ` as Array<{ id: string; code_hash: string; attempts: number }>;

    const otp = rows[0];
    if (!otp) {
      return reply.status(400).send({ error: 'Invalid or expired OTP' });
    }

    const valid = await argon2.verify(otp.code_hash, body.code);
    if (!valid) {
      const attempts = Number(otp.attempts || 0) + 1;
      await prisma.$executeRaw`
        UPDATE auth_phone_otps
        SET attempts = ${attempts}
        WHERE id = ${otp.id}
      `;
      if (attempts >= 3) {
        const blockedUntil = await blockOtp('sms', smsPhone, 'verify_attempt_limit');
        return reply.status(429).send({ code: 'OTP_BLOCKED', error: otpBlockedMessage(blockedUntil) });
      }
      return reply.status(400).send({ error: `Invalid OTP. ${3 - attempts} attempt(s) left.` });
    }

    await prisma.$executeRaw`
      UPDATE auth_phone_otps
      SET consumed_at = NOW()
      WHERE id = ${otp.id}
    `;

    let user = await prisma.user.findFirst({
      where: { OR: uniquePhoneCandidates(body.phone).map((candidate) => ({ phone: candidate })) },
      include: { roles: { include: { role: true } } },
    });

    if (body.intent === 'register' && user) {
      return phoneAlreadyRegisteredResponse(reply);
    }

    if (!user) {
      if (body.intent === 'login') {
        return reply.status(404).send({ code: 'PHONE_NOT_REGISTERED', error: 'No account found for this phone number. Please register first.' });
      }
      user = await prisma.user.create({
        data: {
          phone,
          password_hash: await argon2.hash(body.password || randomUUID()),
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
