const SMS_BD_SEND_URL = 'https://api.sms.net.bd/sendsms';

function smsApiKey() {
  return process.env.SMS_BD_API_KEY?.trim();
}

export function isSmsConfigured() {
  return Boolean(smsApiKey());
}

export function normalizeSmsBdPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  return digits;
}

export async function sendSmsBdOtp(phone: string, code: string) {
  const apiKey = smsApiKey();
  if (!apiKey) {
    throw new Error('SMS sending is not configured');
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    msg: `your chinabuybd.com otp is: ${code}`,
    to: normalizeSmsBdPhone(phone),
  });

  const response = await fetch(SMS_BD_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(Number(process.env.SMS_BD_TIMEOUT_MS || 10000)),
  });

  const json = await response.json().catch(() => null) as { error?: number; msg?: string } | null;
  if (!response.ok || json?.error !== 0) {
    throw new Error(json?.msg || 'Failed to send SMS OTP');
  }

  return json;
}
