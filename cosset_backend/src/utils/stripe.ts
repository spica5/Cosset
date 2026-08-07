import Stripe from 'stripe';

import type { UserPlanType } from '@/models/users';

// ----------------------------------------------------------------------

export type PaidPlanType = Exclude<UserPlanType, 'FREE'>;

export type StripePlanConfig = {
  plan: PaidPlanType;
  name: string;
  description: string;
  unitAmount: number;
  priceId?: string;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(stripeSecretKey.trim());
}

export function getStripe() {
  if (!isStripeConfigured()) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2026-07-29.dahlia',
    });
  }

  return stripeClient;
}

export function getFrontendAppUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:8082'
  ).replace(/\/$/, '');
}

export const STRIPE_PLANS: Record<PaidPlanType, StripePlanConfig> = {
  PAID: {
    plan: 'PAID',
    name: 'Paid Account',
    description: 'Unlimited storage and priority support',
    unitAmount: 999,
    priceId: process.env.STRIPE_PRICE_PAID || undefined,
  },
  'EXTRA-PAID': {
    plan: 'EXTRA-PAID',
    name: 'Extra-paid Account',
    description: 'Advanced analytics and dedicated support',
    unitAmount: 1999,
    priceId: process.env.STRIPE_PRICE_EXTRA_PAID || undefined,
  },
};

export function normalizePaidPlan(value: unknown): PaidPlanType | null {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');

  if (normalized === 'PAID' || normalized === 'EXTRA-PAID') {
    return normalized;
  }

  return null;
}

export function planFromStripePriceId(priceId?: string | null): PaidPlanType | null {
  const normalized = String(priceId || '').trim();
  if (!normalized) {
    return null;
  }

  if (STRIPE_PLANS.PAID.priceId && STRIPE_PLANS.PAID.priceId === normalized) {
    return 'PAID';
  }

  if (STRIPE_PLANS['EXTRA-PAID'].priceId && STRIPE_PLANS['EXTRA-PAID'].priceId === normalized) {
    return 'EXTRA-PAID';
  }

  return null;
}

export function buildSubscriptionLineItem(plan: PaidPlanType): Stripe.Checkout.SessionCreateParams.LineItem {
  const config = STRIPE_PLANS[plan];

  if (config.priceId) {
    return {
      price: config.priceId,
      quantity: 1,
    };
  }

  return {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: config.unitAmount,
      recurring: { interval: 'month' },
      product_data: {
        name: config.name,
        description: config.description,
      },
    },
  };
}
