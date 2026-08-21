import type Stripe from 'stripe';

import { creditWallet } from 'src/models/wallet';

export async function creditWalletFromStripeSession(session: Stripe.Checkout.Session) {
  if (session.mode !== 'payment') {
    return null;
  }

  const kind = String(session.metadata?.kind || '');
  if (kind !== 'wallet_topup') {
    return null;
  }

  const customerId = String(session.metadata?.userId || session.client_reference_id || '').trim();
  const amountCents =
    Math.trunc(Number(session.amount_total)) ||
    Math.trunc(Number(session.metadata?.amountCents)) ||
    0;

  if (!customerId || amountCents <= 0) {
    return null;
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    return null;
  }

  return creditWallet({
    customerId,
    amountCents,
    kind: 'topup',
    description: 'Wallet top-up',
    refType: 'stripe_checkout',
    refId: session.id,
    metadata: {
      provider: 'stripe',
      paymentIntent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null,
    },
  });
}
