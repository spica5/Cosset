import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { getAuthenticatedUser } from 'src/utils/request-auth';
import { getStripe, isStripeConfigured } from 'src/utils/stripe';
import { STATUS, response, handleError } from 'src/utils/response';
import { creditWalletFromStripeSession } from 'src/utils/wallet-topup';
import {
  isPayPalConfigured,
  getPayPalWalletOrder,
  capturePayPalWalletOrder,
} from 'src/utils/paypal';

import { creditWallet } from 'src/models/wallet';

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

    if (provider === 'paypal') {
      if (!isPayPalConfigured()) {
        return response({ message: 'PayPal is not configured' }, STATUS.BAD_REQUEST);
      }

      const orderId = String(body?.orderId || body?.token || '').trim();
      if (!orderId) {
        return response({ message: 'orderId is required' }, STATUS.BAD_REQUEST);
      }

      let captured: Awaited<ReturnType<typeof capturePayPalWalletOrder>>;
      try {
        captured = await capturePayPalWalletOrder(orderId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already/i.test(message)) {
          throw error;
        }
        const existing = await getPayPalWalletOrder(orderId);
        const amountValue = Number.parseFloat(String(existing.purchase_units?.[0]?.amount?.value || '0'));
        captured = {
          orderId: existing.id,
          status: existing.status,
          captureId: null,
          captureStatus: existing.status,
          customerId: existing.purchase_units?.[0]?.custom_id || null,
          amountCents: Number.isFinite(amountValue) ? Math.round(amountValue * 100) : 0,
          currency: 'usd',
        };
      }

      if (
        !['COMPLETED'].includes(String(captured.status || '').toUpperCase()) &&
        String(captured.captureStatus || '').toUpperCase() !== 'COMPLETED'
      ) {
        return response({ message: 'PayPal payment is not completed yet' }, STATUS.BAD_REQUEST);
      }

      const customerId = captured.customerId || user.id;
      if (customerId !== user.id) {
        return response({ message: 'This top-up belongs to another account' }, STATUS.FORBIDDEN);
      }

      const result = await creditWallet({
        customerId: user.id,
        amountCents: captured.amountCents,
        kind: 'topup',
        description: 'Wallet top-up',
        refType: 'paypal_order',
        refId: captured.orderId,
        metadata: {
          provider: 'paypal',
          captureId: captured.captureId,
        },
      });

      return response(
        {
          wallet: {
            balanceCents: result.wallet.balanceCents,
            currency: result.wallet.currency,
          },
          alreadyApplied: result.alreadyApplied,
        },
        STATUS.OK,
      );
    }

    if (!isStripeConfigured()) {
      return response({ message: 'Stripe is not configured' }, STATUS.BAD_REQUEST);
    }

    const sessionId = String(body?.sessionId || '').trim();
    if (!sessionId) {
      return response({ message: 'sessionId is required' }, STATUS.BAD_REQUEST);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = String(session.metadata?.userId || session.client_reference_id || '');
    if (sessionUserId && sessionUserId !== user.id) {
      return response({ message: 'This top-up belongs to another account' }, STATUS.FORBIDDEN);
    }

    const result = await creditWalletFromStripeSession(session);
    if (!result) {
      return response({ message: 'Stripe checkout is not a completed wallet top-up' }, STATUS.BAD_REQUEST);
    }

    return response(
      {
        wallet: {
          balanceCents: result.wallet.balanceCents,
          currency: result.wallet.currency,
        },
        alreadyApplied: result.alreadyApplied,
      },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
    }
    return handleError('Wallet - Confirm', error as Error);
  }
}
