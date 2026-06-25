import nodemailer from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function createTransport() {
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function sendMail(payload: MailPayload) {
  const transporter = createTransport();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || `"ChinaBuyBD" <${process.env.SMTP_USER}>`,
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
