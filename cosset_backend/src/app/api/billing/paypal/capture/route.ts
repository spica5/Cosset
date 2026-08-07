import type { NextRequest } from 'next/server';

import { syncCustomerBilling } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { normalizePaidPlan, STRIPE_PLANS } from 'src/utils/stripe';
import {
  getPayPalSubscription,
  isPayPalConfigured,
  planFromPayPalPlanId,
} from 'src/utils/paypal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return response({ message: 'PayPal is not configured' }, STATUS.BAD_REQUEST);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json().catch(() => ({}));
    const subscriptionId = String(body?.subscriptionId || body?.token || '').trim();
    if (!subscriptionId) {
      return response({ message: 'subscriptionId is required' }, STATUS.BAD_REQUEST);
    }

    const subscription = await getPayPalSubscription(subscriptionId);
    const customId = String(subscription.custom_id || '');
    const customUserId = customId.includes(':') ? customId.split(':')[0] : customId;

    if (customUserId && customUserId !== user.id) {
      return response({ message: 'Subscription does not belong to this customer' }, STATUS.FORBIDDEN);
    }

    const planFromCustom = normalizePaidPlan(customId.includes(':') ? customId.split(':')[1] : null);
    const plan =
      planFromCustom || planFromPayPalPlanId(subscription.plan_id) || normalizePaidPlan(user.plan) || 'PAID';

    const activeStatuses = new Set(['ACTIVE', 'APPROVED']);
    const isActive = activeStatuses.has(String(subscription.status || '').toUpperCase());

    const amountValue = subscription.billing_info?.last_payment?.amount?.value;
    const amountCents = amountValue
      ? Math.round(Number(amountValue) * 100)
      : STRIPE_PLANS[plan].unitAmount;

    await syncCustomerBilling({
      customerId: user.id,
      provider: 'paypal',
      plan: isActive ? plan : 'FREE',
      amountCents,
      currency: (
        subscription.billing_info?.last_payment?.amount?.currency_code || 'USD'
      ).toLowerCase(),
      status: isActive ? 'active' : 'pending',
      providerCustomerId: subscription.subscriber?.payer_id || null,
      priceId: subscription.plan_id || null,
      externalCheckoutId: subscription.id,
      externalSubscriptionId: subscription.id,
      currentPeriodEnd: isActive ? subscription.billing_info?.next_billing_time || null : null,
      metadata: {
        paypalStatus: subscription.status,
        planId: subscription.plan_id,
      },
    });

    return response(
      {
        status: subscription.status,
        plan: isActive ? plan : user.plan,
        active: isActive,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Billing - PayPal Capture', error as Error);
  }
}
