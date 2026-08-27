import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';
import {
  MAX_TOPUP_CENTS,
  MIN_TOPUP_CENTS,
} from '@/models/wallet';
import {
  createCustomerPayment,
  getLatestProviderCustomerId,
} from '@/models/payments';

import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  isPayPalConfigured,
  createPayPalWalletOrder,
} from 'src/utils/paypal';
import {
  getStripe,
  getFrontendAppUrl,
  isStripeConfigured,
} from 'src/utils/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider || 'stripe').trim().toLowerCase();
    const amountCents = Math.trunc(Number(body?.amountCents));

    if (!Number.isFinite(amountCents) || amountCents < MIN_TOPUP_CENTS) {
      return response(
        { message: `Minimum top-up is $${(MIN_TOPUP_CENTS / 100).toFixed(2)}` },
        STATUS.BAD_REQUEST,
      );
    }

    if (amountCents > MAX_TOPUP_CENTS) {
      return response(
        { message: `Maximum top-up is $${(MAX_TOPUP_CENTS / 100).toFixed(2)}` },
        STATUS.BAD_REQUEST,
      );
    }

    if (provider === 'paypal') {
      if (!isPayPalConfigured()) {
        return response(
          { message: 'PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.' },
          STATUS.BAD_REQUEST,
        );
      }

      const order = await createPayPalWalletOrder({
        userId: user.id,
        amountCents,
      });

      return response(
        {
          url: order.url,
          orderId: order.orderId,
          provider: 'paypal',
        },
        STATUS.OK,
      );
    }

    if (!isStripeConfigured()) {
      return response(
        { message: 'Stripe is not configured. Set STRIPE_SECRET_KEY on the API server.' },
        STATUS.BAD_REQUEST,
      );
    }

    const stripe = getStripe();
    let providerCustomerId =
      (await getLatestProviderCustomerId(user.id, 'stripe')) || undefined;

    if (!providerCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
        metadata: { userId: user.id },
      });
      providerCustomerId = customer.id;
    }

    const appUrl = getFrontendAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: providerCustomerId,
      client_reference_id: user.id,
      success_url: `${appUrl}/dashboard/settings/account?wallet=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/settings/account?wallet=canceled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Cosset wallet top-up',
              description: `Add $${(amountCents / 100).toFixed(2)} to your Cosset wallet`,
            },
          },
        },
      ],
      metadata: {
        userId: user.id,
        kind: 'wallet_topup',
        amountCents: String(amountCents),
      },
      payment_intent_data: {
        metadata: {
          userId: user.id,
          kind: 'wallet_topup',
          amountCents: String(amountCents),
        },
      },
    });

    if (!session.url) {
      return response({ message: 'Failed to create Stripe Checkout session' }, STATUS.ERROR);
    }

    await createCustomerPayment({
      customerId: user.id,
      provider: 'stripe',
      plan: user.plan || 'FREE',
      amountCents,
      currency: 'usd',
      status: 'pending',
      providerCustomerId,
      externalCheckoutId: session.id,
      metadata: { source: 'wallet-topup' },
    });

    return response(
      { url: session.url, sessionId: session.id, provider: 'stripe' },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
    }
    return handleError('Wallet - Topup', error as Error);
  }
}
