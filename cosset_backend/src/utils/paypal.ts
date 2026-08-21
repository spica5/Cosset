import type { PaidPlanType } from 'src/utils/stripe';

import { STRIPE_PLANS, getFrontendAppUrl } from 'src/utils/stripe';

// ----------------------------------------------------------------------

const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
const paypalMode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();

export type PayPalPlanConfig = {
  plan: PaidPlanType;
  name: string;
  description: string;
  unitAmount: number;
  planId?: string;
};

export function isPayPalConfigured() {
  return Boolean(paypalClientId.trim() && paypalClientSecret.trim());
}

export function getPayPalApiBase() {
  return paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export const PAYPAL_PLANS: Record<PaidPlanType, PayPalPlanConfig> = {
  PAID: {
    plan: 'PAID',
    name: STRIPE_PLANS.PAID.name,
    description: STRIPE_PLANS.PAID.description,
    unitAmount: STRIPE_PLANS.PAID.unitAmount,
    planId: process.env.PAYPAL_PLAN_PAID || undefined,
  },
  'EXTRA-PAID': {
    plan: 'EXTRA-PAID',
    name: STRIPE_PLANS['EXTRA-PAID'].name,
    description: STRIPE_PLANS['EXTRA-PAID'].description,
    unitAmount: STRIPE_PLANS['EXTRA-PAID'].unitAmount,
    planId: process.env.PAYPAL_PLAN_EXTRA_PAID || undefined,
  },
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
const planIdCache = new Map<PaidPlanType, string>();

type PayPalResponseData = {
  message?: string;
  error_description?: string;
  details?: Array<{ description?: string }>;
  raw?: string;
};

async function paypalFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    accessToken?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const res = await fetch(`${getPayPalApiBase()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await res.text();
  let data: PayPalResponseData | null = null;
  try {
    data = text ? (JSON.parse(text) as PayPalResponseData) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error_description ||
      data?.details?.[0]?.description ||
      `PayPal request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function getPayPalAccessToken() {
  if (!isPayPalConfigured()) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not configured');
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const credentials = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');
  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || 'Failed to get PayPal access token');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 300) * 1000,
  };

  return cachedToken.accessToken;
}

async function ensurePayPalPlanId(plan: PaidPlanType, accessToken: string) {
  const configured = PAYPAL_PLANS[plan].planId || planIdCache.get(plan);
  if (configured) {
    return configured;
  }

  const config = PAYPAL_PLANS[plan];
  const product = await paypalFetch<{ id: string }>('/v1/catalogs/products', {
    method: 'POST',
    accessToken,
    body: {
      name: `Cosset ${config.name}`,
      description: config.description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    },
  });

  const createdPlan = await paypalFetch<{ id: string }>('/v1/billing/plans', {
    method: 'POST',
    accessToken,
    body: {
      product_id: product.id,
      name: `Cosset ${config.name} Monthly`,
      description: config.description,
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: (config.unitAmount / 100).toFixed(2),
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    },
  });

  planIdCache.set(plan, createdPlan.id);
  return createdPlan.id;
}

export async function createPayPalSubscription(params: {
  plan: PaidPlanType;
  userId: string;
  email?: string | null;
  customId?: string;
}) {
  const accessToken = await getPayPalAccessToken();
  const planId = await ensurePayPalPlanId(params.plan, accessToken);
  const appUrl = getFrontendAppUrl();

  const subscription = await paypalFetch<{
    id: string;
    status: string;
    links?: Array<{ rel: string; href: string }>;
  }>('/v1/billing/subscriptions', {
    method: 'POST',
    accessToken,
    headers: {
      Prefer: 'return=representation',
      'PayPal-Request-Id': `cosset-${params.userId}-${params.plan}-${Date.now()}`,
    },
    body: {
      plan_id: planId,
      custom_id: params.customId || params.userId,
      subscriber: params.email
        ? {
            email_address: params.email,
          }
        : undefined,
      application_context: {
        brand_name: 'Cosset',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${appUrl}/dashboard/settings/account?billing=paypal_success`,
        cancel_url: `${appUrl}/dashboard/settings/account?billing=canceled`,
      },
    },
  });

  const approveUrl = subscription.links?.find((link) => link.rel === 'approve')?.href;
  if (!approveUrl) {
    throw new Error('PayPal did not return an approval URL');
  }

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    approveUrl,
    planId,
  };
}

export async function getPayPalSubscription(subscriptionId: string) {
  const accessToken = await getPayPalAccessToken();
  return paypalFetch<{
    id: string;
    status: string;
    custom_id?: string;
    plan_id?: string;
    subscriber?: { payer_id?: string; email_address?: string };
    billing_info?: {
      next_billing_time?: string;
      last_payment?: { amount?: { value?: string; currency_code?: string } };
    };
  }>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    accessToken,
  });
}

export async function cancelPayPalSubscription(subscriptionId: string, reason?: string) {
  const accessToken = await getPayPalAccessToken();
  await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    accessToken,
    body: {
      reason: reason || 'Customer canceled from Cosset account settings',
    },
  });
}

export async function createPayPalWalletOrder(params: {
  userId: string;
  amountCents: number;
}) {
  const accessToken = await getPayPalAccessToken();
  const appUrl = getFrontendAppUrl();
  const amountValue = (params.amountCents / 100).toFixed(2);

  const order = await paypalFetch<{
    id: string;
    status: string;
    links?: Array<{ rel: string; href: string }>;
  }>('/v2/checkout/orders', {
    method: 'POST',
    accessToken,
    headers: {
      Prefer: 'return=representation',
      'PayPal-Request-Id': `cosset-wallet-${params.userId}-${params.amountCents}-${Date.now()}`,
    },
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: params.userId,
          description: 'Cosset wallet top-up',
          amount: {
            currency_code: 'USD',
            value: amountValue,
          },
        },
      ],
      application_context: {
        brand_name: 'Cosset',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${appUrl}/dashboard/settings/account?wallet=paypal_success`,
        cancel_url: `${appUrl}/dashboard/settings/account?wallet=canceled`,
      },
    },
  });

  const approveUrl = order.links?.find((link) => link.rel === 'approve')?.href;
  if (!approveUrl) {
    throw new Error('PayPal did not return an approval URL');
  }

  return {
    orderId: order.id,
    status: order.status,
    url: approveUrl,
  };
}

export async function capturePayPalWalletOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const captured = await paypalFetch<{
    id: string;
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    accessToken,
    headers: {
      Prefer: 'return=representation',
    },
  });

  const unit = captured.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const amountValue = Number.parseFloat(String(capture?.amount?.value || '0'));
  const amountCents = Number.isFinite(amountValue) ? Math.round(amountValue * 100) : 0;

  return {
    orderId: captured.id,
    status: captured.status,
    captureId: capture?.id || null,
    captureStatus: capture?.status || null,
    customerId: unit?.custom_id || null,
    amountCents,
    currency: (capture?.amount?.currency_code || 'USD').toLowerCase(),
  };
}

export async function getPayPalWalletOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  return paypalFetch<{
    id: string;
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    accessToken,
  });
}

export function planFromPayPalPlanId(planId?: string | null): PaidPlanType | null {
  const normalized = String(planId || '').trim();
  if (!normalized) {
    return null;
  }

  if (PAYPAL_PLANS.PAID.planId && PAYPAL_PLANS.PAID.planId === normalized) {
    return 'PAID';
  }
  if (PAYPAL_PLANS['EXTRA-PAID'].planId && PAYPAL_PLANS['EXTRA-PAID'].planId === normalized) {
    return 'EXTRA-PAID';
  }

  return [...planIdCache.entries()].find(([, cachedId]) => cachedId === normalized)?.[0] || null;
}

export { getFrontendAppUrl };
