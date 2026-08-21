import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';

import { getUserById } from '@/models/users';
import {
  getCustomerPaymentByProviderCustomerId,
  syncCustomerBilling,
} from '@/models/payments';

import { creditWalletFromStripeSession } from 'src/utils/wallet-topup';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  getStripe,
  STRIPE_PLANS,
  isStripeConfigured,
  normalizePaidPlan,
  planFromStripePriceId,
  type PaidPlanType,
} from 'src/utils/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function resolveUserIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = String(subscription.metadata?.userId || '').trim();
  if (metadataUserId) {
    return metadataUserId;
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return null;
  }

  const payment = await getCustomerPaymentByProviderCustomerId('stripe', customerId);
  return payment?.customerId || null;
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription): PaidPlanType {
  const metadataPlan = normalizePaidPlan(subscription.metadata?.plan);
  if (metadataPlan) {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  return planFromStripePriceId(priceId) || 'PAID';
}

async function applySubscription(subscription: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) {
    console.warn('[Billing - Webhook] No user found for subscription', subscription.id);
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    console.warn('[Billing - Webhook] User missing for subscription', subscription.id, userId);
    return;
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id || null;
  const periodEndSeconds =
    subscription.items.data[0]?.current_period_end ||
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const periodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : null;

  const status = subscription.status;
  const isActive = status === 'active' || status === 'trialing' || status === 'past_due';
  const plan = isActive ? resolvePlanFromSubscription(subscription) : 'FREE';
  const paidPlan = (plan === 'FREE' ? 'PAID' : plan) as PaidPlanType;

  await syncCustomerBilling({
    customerId: userId,
    provider: 'stripe',
    plan: isActive ? plan : 'FREE',
    amountCents: STRIPE_PLANS[paidPlan].unitAmount,
    status: isActive ? 'active' : status === 'canceled' ? 'canceled' : 'pending',
    providerCustomerId: customerId || null,
    priceId: isActive ? priceId : null,
    externalCheckoutId: subscription.id,
    externalSubscriptionId: isActive ? subscription.id : subscription.id,
    currentPeriodEnd: isActive ? periodEnd : null,
    metadata: {
      stripeStatus: status,
      priceId,
      source: 'stripe-webhook',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return response({ message: 'Stripe is not configured' }, STATUS.BAD_REQUEST);
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      return response({ message: 'STRIPE_WEBHOOK_SECRET is not configured' }, STATUS.BAD_REQUEST);
    }

    const stripe = getStripe();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return response({ message: 'Missing stripe-signature header' }, STATUS.BAD_REQUEST);
    }

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error('[Billing - Webhook] Signature verification failed', error);
      return response({ message: 'Invalid Stripe signature' }, STATUS.BAD_REQUEST);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          try {
            await creditWalletFromStripeSession(session);
          } catch (error) {
            console.error('[Billing - Webhook] Wallet top-up failed', error);
          }
          break;
        }
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (session.metadata?.plan && !subscription.metadata?.plan) {
            await stripe.subscriptions.update(subscriptionId, {
              metadata: {
                ...subscription.metadata,
                userId: session.metadata.userId || subscription.metadata.userId || '',
                plan: session.metadata.plan,
              },
            });
            const refreshed = await stripe.subscriptions.retrieve(subscriptionId);
            await applySubscription(refreshed);
          } else {
            await applySubscription(subscription);
          }

          const plan = normalizePaidPlan(session.metadata?.plan) || 'PAID';
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer?.id;
          if (session.metadata?.userId) {
            await syncCustomerBilling({
              customerId: session.metadata.userId,
              provider: 'stripe',
              plan,
              amountCents: STRIPE_PLANS[plan].unitAmount,
              status: 'active',
              providerCustomerId: customerId || null,
              externalCheckoutId: session.id,
              externalPaymentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : session.payment_intent?.id || null,
              externalSubscriptionId: subscriptionId,
              metadata: { source: 'checkout.session.completed' },
            });
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return response({ received: true }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - Webhook', error as Error);
  }
}
