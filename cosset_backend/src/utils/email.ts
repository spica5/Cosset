import dns from 'dns/promises';
import { Resolver } from 'dns';

import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import nodemailer from 'nodemailer';
import { promisify } from 'node:util';

const RESEND_API_URL = 'https://api.resend.com/emails';
const SMTP_TIMEOUT_MS = 12_000;
const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

const publicDnsResolver = new Resolver();
publicDnsResolver.setServers(PUBLIC_DNS_SERVERS);
const resolve4Public = promisify(publicDnsResolver.resolve4.bind(publicDnsResolver));

export type EmailSendResult = {
  sent: boolean;
  /** True when email could not be delivered externally. */
  devMode?: boolean;
  error?: string;
};

type SmtpConnection = {
  connectHost: string;
  servername: string;
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

function createSmtpTransporter(port: number, connection: SmtpConnection): nodemailer.Transporter {
  const user = trimEnv(process.env.SMTP_USER);
  const pass = trimEnv(process.env.SMTP_PASSWORD) || trimEnv(process.env.SMTP_PASS);

  const timeoutOptions = {
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  };

  const transport: SMTPTransport.Options = {
    host: connection.connectHost,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: {
      servername: connection.servername,
      minVersion: 'TLSv1.2',
    },
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

async function resolveSystemIpv4(host: string): Promise<string[]> {
  try {
    return await dns.resolve4(host);
  } catch {
    return [];
  }
}

async function resolvePublicIpv4(host: string): Promise<string[]> {
  try {
    return await resolve4Public(host);
  } catch {
    return [];
  }
}

/**
 * Resolve SMTP host using public DNS when VPN/system DNS returns private IPs.
 */
async function resolveSmtpConnection(
  smtpHost: string,
  logPrefix: string,
): Promise<SmtpConnection | null> {
  const [systemIps, publicIps] = await Promise.all([
    resolveSystemIpv4(smtpHost),
    resolvePublicIpv4(smtpHost),
  ]);

  const publicIp = publicIps.find((ip) => !isPrivateIp(ip));
  if (publicIp) {
    const systemBlocked = systemIps.length > 0 && systemIps.every(isPrivateIp);
    if (systemBlocked) {
      console.warn(
        `${logPrefix} System DNS for "${smtpHost}" is blocked (${systemIps.join(', ')}). ` +
          `Connecting via public DNS (${publicIp}).`,
      );
    }
    return { connectHost: publicIp, servername: smtpHost };
  }

  const systemPublicIp = systemIps.find((ip) => !isPrivateIp(ip));
  if (systemPublicIp) {
    return { connectHost: systemPublicIp, servername: smtpHost };
  }

  if (systemIps.length > 0 && systemIps.every(isPrivateIp)) {
    console.warn(
      `${logPrefix} SMTP host "${smtpHost}" resolves only to private IP(s): ${systemIps.join(', ')}. ` +
        'Configure RESEND_API_KEY or fix DNS/VPN.',
    );
    return null;
  }

  return { connectHost: smtpHost, servername: smtpHost };
}

async function sendViaSmtp(
  to: string,
  subject: string,
  text: string,
  html: string,
  logPrefix = '[Email]',
): Promise<void> {
  const smtpHost = trimEnv(process.env.SMTP_HOST);
  const user = trimEnv(process.env.SMTP_USER);
  const from =
    trimEnv(process.env.SMTP_FROM) || trimEnv(process.env.EMAIL_FROM) || `"Cosset" <${user}>`;

  const connection = await resolveSmtpConnection(smtpHost, logPrefix);
  if (!connection) {
    throw new Error(
      'SMTP is unreachable because the mail host resolves to a private IP. Add RESEND_API_KEY or disable VPN DNS blocking.',
    );
  }

  const primaryPort = Number(trimEnv(process.env.SMTP_PORT) || '587');
  const portsToTry = [...new Set([primaryPort, primaryPort === 587 ? 465 : 587])];

  let lastError: unknown;

  const sendSucceeded = await portsToTry.reduce<Promise<boolean>>(async (didSend, port) => {
    if (await didSend) {
      return true;
    }

    try {
      const transporter = createSmtpTransporter(port, connection);
      await transporter.sendMail({ from, to, subject, text, html });
      console.info(`${logPrefix} Email sent via SMTP (port ${port}) to ${to}`);
      return true;
    } catch (error) {
      lastError = error;
      console.warn(`${logPrefix} SMTP port ${port} failed:`, error);
      return false;
    }
  }, Promise.resolve(false));

  if (sendSucceeded) {
    return;
  }

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

export async function sendUserMail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailSendResult> {
  const { to, subject, text, html } = params;
  const errors: string[] = [];

  if (isResendConfigured()) {
    try {
      await sendViaResend(to, subject, text, html);
      console.info(`[Mail] Email sent via Resend to ${to}`);
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resend failed';
      errors.push(message);
      console.warn('[Mail] Resend failed:', error);
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(to, subject, text, html, '[Mail]');
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP failed';
      errors.push(message);
      console.error('[Mail] SMTP failed:', error);
    }
  }

  if (!isSmtpConfigured() && !isResendConfigured()) {
    console.warn(`[Mail] Email provider not configured. Message to ${to} was saved in-app only.`);
    return { sent: false, devMode: true };
  }

  console.warn(`[Mail] External delivery failed for ${to}; message can still be read in-app.`);
  return {
    sent: false,
    devMode: true,
    error: errors.join(' | ') || 'External email delivery failed',
  };
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
