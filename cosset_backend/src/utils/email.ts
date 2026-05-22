import dns from 'dns/promises';

import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const RESEND_API_URL = 'https://api.resend.com/emails';
const SMTP_TIMEOUT_MS = 12_000;

export type EmailSendResult = {
  sent: boolean;
  /** True when email could not be delivered; code is available via dev fallback. */
  devMode?: boolean;
  error?: string;
};

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:8081'
  ).replace(/\/$/, '');
}

function trimEnv(value?: string): string {
  return value?.trim().replace(/^['"]|['"]$/g, '') || '';
}

function isSmtpConfigured(): boolean {
  return Boolean(trimEnv(process.env.SMTP_HOST) && trimEnv(process.env.SMTP_USER));
}

function isResendConfigured(): boolean {
  return Boolean(trimEnv(process.env.RESEND_API_KEY));
}

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEV_EXPOSE_CODE === 'true';
}

function buildResetEmailContent(email: string, code: string) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/update-password?email=${encodeURIComponent(email)}`;

  return {
    subject: 'Reset your Cosset password',
    text: [
      'You requested a password reset for your Cosset account.',
      '',
      `Your verification code is: ${code}`,
      '',
      `Or open this link to set a new password: ${resetUrl}`,
      '',
      'This code expires in 15 minutes. If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>You requested a password reset for your Cosset account.</p>
      <p><strong>Your verification code is:</strong></p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>Or <a href="${resetUrl}">click here</a> to set a new password.</p>
      <p style="color:#666;font-size:12px;">This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
    `,
  };
}

function createSmtpTransporter(port: number): nodemailer.Transporter {
  const host = trimEnv(process.env.SMTP_HOST);
  const user = trimEnv(process.env.SMTP_USER);
  const pass = trimEnv(process.env.SMTP_PASSWORD) || trimEnv(process.env.SMTP_PASS);
  const isGmail = host.includes('gmail.com') || user.endsWith('@gmail.com');

  const timeoutOptions = {
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  };

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      ...timeoutOptions,
    });
  }

  const transport: SMTPTransport.Options = {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
    ...timeoutOptions,
  };

  return nodemailer.createTransport(transport);
}

function isPrivateIp(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('127.')
  );
}

async function warnIfSmtpHostMisconfigured(host: string): Promise<void> {
  try {
    const addresses = await dns.resolve4(host);
    const bad = addresses.filter(isPrivateIp);

    if (bad.length) {
      console.warn(
        `[Password Reset] SMTP host "${host}" resolves to private IP(s): ${bad.join(', ')}. ` +
          'This usually means VPN/DNS is blocking Gmail. Use Resend (RESEND_API_KEY) or fix DNS.',
      );
    }
  } catch {
    // ignore DNS lookup failures; nodemailer will surface connection errors
  }
}

async function sendViaSmtp(to: string, subject: string, text: string, html: string): Promise<void> {
  const host = trimEnv(process.env.SMTP_HOST);
  const user = trimEnv(process.env.SMTP_USER);
  const from =
    trimEnv(process.env.SMTP_FROM) || trimEnv(process.env.EMAIL_FROM) || `"Cosset" <${user}>`;

  await warnIfSmtpHostMisconfigured(host);

  const primaryPort = Number(trimEnv(process.env.SMTP_PORT) || '587');
  const portsToTry = [...new Set([primaryPort, primaryPort === 587 ? 465 : 587])];

  let lastError: unknown;

  portsToTry.forEach(async (port) => {
    try {
      const transporter = createSmtpTransporter(port);
      await transporter.sendMail({ from, to, subject, text, html });
      console.info(`[Password Reset] Email sent via SMTP (port ${port}) to ${to}`);
    } catch (error) {
      lastError = error;
      console.warn(`[Password Reset] SMTP port ${port} failed:`, error);
    }
  });

  throw lastError;
}

async function sendViaResend(to: string, subject: string, text: string, html: string): Promise<void> {
  const apiKey = trimEnv(process.env.RESEND_API_KEY);
  const from = trimEnv(process.env.EMAIL_FROM) || 'Cosset <onboarding@resend.dev>';

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend API error: ${detail}`);
  }
}

function logDevFallback(email: string, code: string): void {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/update-password?email=${encodeURIComponent(email)}`;

  console.warn('[Password Reset] Using dev fallback — email was not delivered.');
  console.info(`[Password Reset] Email: ${email}`);
  console.info(`[Password Reset] Code: ${code}`);
  console.info(`[Password Reset] Link: ${resetUrl}`);
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<EmailSendResult> {
  const { subject, text, html } = buildResetEmailContent(email, code);
  const errors: string[] = [];

  if (isResendConfigured()) {
    try {
      await sendViaResend(email, subject, text, html);
      console.info(`[Password Reset] Email sent via Resend to ${email}`);
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resend failed';
      errors.push(message);
      console.warn('[Password Reset] Resend failed:', error);
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(email, subject, text, html);
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP failed';
      errors.push(message);
      console.error('[Password Reset] SMTP failed:', error);
    }
  }

  if (!isSmtpConfigured() && !isResendConfigured()) {
    logDevFallback(email, code);
    return { sent: false, devMode: true };
  }

  if (isDevEnvironment()) {
    logDevFallback(email, code);
    return {
      sent: false,
      devMode: true,
      error: errors.join(' | '),
    };
  }

  throw new Error(errors.join(' | ') || 'Failed to send password reset email');
}
