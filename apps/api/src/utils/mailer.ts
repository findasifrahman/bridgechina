import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpConfig = {
  host?: string;
  port: number;
  user?: string;
  password?: string;
  from?: string;
};

function envValue(...keys: string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined) continue;
    const value = raw.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (value) return value;
  }
  return undefined;
}

function smtpConfig(): SmtpConfig {
  return {
    host: envValue('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST'),
    port: Number(envValue('SMTP_PORT', 'MAIL_PORT', 'EMAIL_PORT') || 587),
    user: envValue('SMTP_USER', 'SMTP_USERNAME', 'MAIL_USER', 'MAIL_USERNAME', 'EMAIL_USER', 'GMAIL_USER'),
    password: envValue('SMTP_PASSWORD', 'SMTP_PASS', 'MAIL_PASSWORD', 'MAIL_PASS', 'EMAIL_PASSWORD', 'GMAIL_APP_PASSWORD'),
    from: envValue('SMTP_FROM', 'MAIL_FROM', 'EMAIL_FROM'),
  };
}

function smtpConfigured() {
  const config = smtpConfig();
  return Boolean(config.host && config.port && config.user && config.password);
}

export function mailerConfigStatus() {
  const config = smtpConfig();
  return {
    configured: Boolean(config.host && config.port && config.user && config.password),
    missing: [
      !config.host ? 'SMTP_HOST' : null,
      !config.port ? 'SMTP_PORT' : null,
      !config.user ? 'SMTP_USER' : null,
      !config.password ? 'SMTP_PASSWORD' : null,
    ].filter(Boolean),
    host: config.host ? 'set' : 'missing',
    port: config.port ? 'set' : 'missing',
    user: config.user ? 'set' : 'missing',
    password: config.password ? 'set' : 'missing',
    from: config.from ? 'set' : 'default',
  };
}

function createTransport() {
  const config = smtpConfig();
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

export async function sendMail(payload: MailPayload) {
  const config = smtpConfig();
  const transporter = createTransport();
  return transporter.sendMail({
    from: config.from || `"ChinaBuyBD" <${config.user}>`,
    ...payload,
  });
}

export function isMailerConfigured() {
  return smtpConfigured();
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
