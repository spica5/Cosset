import type { NextRequest } from 'next/server';

import { createCustomerPayment, getCustomerBillingSummary } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { normalizePaidPlan, STRIPE_PLANS } from 'src/utils/stripe';
import { createPayPalSubscription, isPayPalConfigured } from 'src/utils/paypal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return response(
        {
          message:
            'PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the API server.',
        },
        STATUS.BAD_REQUEST,
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json().catch(() => ({}));
    const plan = normalizePaidPlan(body?.plan);
    if (!plan) {
      return response({ message: 'plan must be PAID or EXTRA-PAID' }, STATUS.BAD_REQUEST);
    }

    const billing = await getCustomerBillingSummary(user.id);
    if (billing.plan === plan && billing.provider === 'paypal' && billing.externalSubscriptionId) {
      return response({ message: 'You are already on this plan.' }, STATUS.BAD_REQUEST);
    }

    const subscription = await createPayPalSubscription({
      plan,
      userId: user.id,
      email: user.email,
      customId: `${user.id}:${plan}`,
    });

    await createCustomerPayment({
      customerId: user.id,
      provider: 'paypal',
      plan,
      amountCents: STRIPE_PLANS[plan].unitAmount,
      currency: 'usd',
      status: 'pending',
      externalCheckoutId: subscription.subscriptionId,
      externalSubscriptionId: subscription.subscriptionId,
      metadata: {
        paypalPlanId: subscription.planId,
        status: subscription.status,
      },
    });

    return response(
      {
        url: subscription.approveUrl,
        subscriptionId: subscription.subscriptionId,
        provider: 'paypal',
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Billing - PayPal Checkout', error as Error);
  }
}
