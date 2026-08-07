import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { syncCustomerBilling } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { normalizePaidPlan, STRIPE_PLANS } from 'src/utils/stripe';
import {
  getPayPalSubscription,
  isPayPalConfigured,
  planFromPayPalPlanId,
} from 'src/utils/paypal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function applyPayPalSubscription(subscriptionId: string) {
  const subscription = await getPayPalSubscription(subscriptionId);
  const customId = String(subscription.custom_id || '');
  const userId = customId.includes(':') ? customId.split(':')[0] : customId;

  if (!userId) {
    console.warn('[Billing - PayPal Webhook] Missing custom_id/user for', subscriptionId);
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    console.warn('[Billing - PayPal Webhook] User not found', userId);
    return;
  }

  const planFromCustom = normalizePaidPlan(customId.includes(':') ? customId.split(':')[1] : null);
  const plan =
    planFromCustom || planFromPayPalPlanId(subscription.plan_id) || normalizePaidPlan(user.plan) || 'PAID';

  const status = String(subscription.status || '').toUpperCase();
  const isActive = status === 'ACTIVE' || status === 'APPROVED';
  const amountValue = subscription.billing_info?.last_payment?.amount?.value;
  const amountCents = amountValue
    ? Math.round(Number(amountValue) * 100)
    : STRIPE_PLANS[plan].unitAmount;

  await syncCustomerBilling({
    customerId: userId,
    provider: 'paypal',
    plan: isActive ? plan : 'FREE',
    amountCents,
    currency: (subscription.billing_info?.last_payment?.amount?.currency_code || 'USD').toLowerCase(),
    status: isActive ? 'active' : status === 'CANCELLED' ? 'canceled' : 'pending',
    providerCustomerId: subscription.subscriber?.payer_id || null,
    priceId: subscription.plan_id || null,
    externalCheckoutId: subscription.id,
    externalSubscriptionId: subscription.id,
    currentPeriodEnd: isActive ? subscription.billing_info?.next_billing_time || null : null,
    metadata: {
      paypalStatus: subscription.status,
      planId: subscription.plan_id,
      source: 'webhook',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return response({ message: 'PayPal is not configured' }, STATUS.BAD_REQUEST);
    }

    const event = await req.json().catch(() => null);
    const eventType = String(event?.event_type || '');
    const resource = event?.resource || {};

    const subscriptionId =
      String(resource.id || '').trim() ||
      String(resource.billing_agreement_id || '').trim() ||
      String(resource.supplementary_data?.related_ids?.subscription_id || '').trim();

    if (
      subscriptionId &&
      (eventType.startsWith('BILLING.SUBSCRIPTION.') ||
        eventType === 'PAYMENT.SALE.COMPLETED' ||
        eventType === 'PAYMENT.SALE.DENIED')
    ) {
      await applyPayPalSubscription(subscriptionId);
    }

    return response({ received: true }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - PayPal Webhook', error as Error);
  }
}
