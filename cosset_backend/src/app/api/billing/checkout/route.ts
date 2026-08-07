import type { NextRequest } from 'next/server';

import {
  createCustomerPayment,
  getCustomerBillingSummary,
  getLatestProviderCustomerId,
  syncCustomerBilling,
} from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import {
  getStripe,
  STRIPE_PLANS,
  getFrontendAppUrl,
  isStripeConfigured,
  normalizePaidPlan,
  buildSubscriptionLineItem,
} from 'src/utils/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return response(
        { message: 'Stripe is not configured. Set STRIPE_SECRET_KEY on the API server.' },
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

    if (billing.plan === plan && billing.provider === 'stripe' && billing.externalSubscriptionId) {
      return response({ message: 'You are already on this plan.' }, STATUS.BAD_REQUEST);
    }

    const stripe = getStripe();
    let providerCustomerId =
      (await getLatestProviderCustomerId(user.id, 'stripe')) || undefined;

    if (!providerCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
        metadata: {
          userId: user.id,
        },
      });
      providerCustomerId = customer.id;

      await createCustomerPayment({
        customerId: user.id,
        provider: 'stripe',
        plan: user.plan || 'FREE',
        amountCents: 0,
        status: 'pending',
        providerCustomerId,
        metadata: { source: 'customer-create' },
      });
    }

    if (billing.provider === 'stripe' && billing.externalSubscriptionId) {
      const targetPriceId = STRIPE_PLANS[plan].priceId;
      if (targetPriceId) {
        const subscription = await stripe.subscriptions.retrieve(billing.externalSubscriptionId);
        const itemId = subscription.items.data[0]?.id;
        if (itemId) {
          const updated = await stripe.subscriptions.update(billing.externalSubscriptionId, {
            items: [{ id: itemId, price: targetPriceId }],
            proration_behavior: 'create_prorations',
            metadata: {
              ...subscription.metadata,
              userId: user.id,
              plan,
            },
          });

          const periodEndSeconds = updated.items.data[0]?.current_period_end;
          await syncCustomerBilling({
            customerId: user.id,
            provider: 'stripe',
            plan,
            amountCents: STRIPE_PLANS[plan].unitAmount,
            status: 'active',
            providerCustomerId,
            priceId: targetPriceId,
            externalCheckoutId: updated.id,
            externalSubscriptionId: updated.id,
            currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
            metadata: { source: 'subscription-update' },
          });

          return response(
            {
              updated: true,
              plan,
              message: `Switched to ${STRIPE_PLANS[plan].name}.`,
            },
            STATUS.OK,
          );
        }
      }

      const appUrl = getFrontendAppUrl();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: providerCustomerId,
        return_url: `${appUrl}/dashboard/settings/account`,
      });
      return response({ url: portalSession.url }, STATUS.OK);
    }

    const appUrl = getFrontendAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: providerCustomerId,
      client_reference_id: user.id,
      success_url: `${appUrl}/dashboard/settings/account?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/settings/account?billing=canceled`,
      allow_promotion_codes: true,
      line_items: [buildSubscriptionLineItem(plan)],
      metadata: {
        userId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
    });

    if (!session.url) {
      return response({ message: 'Failed to create Stripe Checkout session' }, STATUS.ERROR);
    }

    await createCustomerPayment({
      customerId: user.id,
      provider: 'stripe',
      plan,
      amountCents: STRIPE_PLANS[plan].unitAmount,
      currency: 'usd',
      status: 'pending',
      providerCustomerId,
      externalCheckoutId: session.id,
      metadata: { source: 'checkout-session' },
    });

    return response({ url: session.url, sessionId: session.id, provider: 'stripe' }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - Checkout', error as Error);
  }
}
