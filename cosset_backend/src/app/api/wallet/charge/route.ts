import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { chargeCinemaWatch, ensureWallet, getCinemaWatchQuote } from 'src/models/wallet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const screeningId = Number.parseInt(req.nextUrl.searchParams.get('screeningId') || '', 10);
    if (!Number.isFinite(screeningId) || screeningId <= 0) {
      return response({ message: 'screeningId is required' }, STATUS.BAD_REQUEST);
    }

    const quote = await getCinemaWatchQuote(screeningId, user.plan);
    const wallet = await ensureWallet(user.id);

    return response(
      {
        quote,
        wallet: {
          balanceCents: wallet.balanceCents,
          currency: wallet.currency,
        },
        canAfford: wallet.balanceCents >= quote.chargeCents,
      },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
    }
    return handleError('Wallet - Quote', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const kind = String(body?.kind || 'cinema_watch').trim().toLowerCase();
      if (kind !== 'cinema_watch') {
        return response({ message: 'Unsupported charge kind' }, STATUS.BAD_REQUEST);
      }

      const screeningId = Number.parseInt(String(body?.screeningId || ''), 10);
      if (!Number.isFinite(screeningId) || screeningId <= 0) {
        return response({ message: 'screeningId is required' }, STATUS.BAD_REQUEST);
      }

      const result = await chargeCinemaWatch({
        customerId: user.id,
        screeningId,
      });

      return response(
        {
          wallet: {
            balanceCents: result.wallet.balanceCents,
            currency: result.wallet.currency,
          },
          quote: result.quote,
          ledger: result.ledger,
        },
        STATUS.OK,
      );
    } catch (error) {
      if (error instanceof DatabaseError) {
        const status = error.code === 'WALLET_INSUFFICIENT' ? STATUS.CONFLICT : STATUS.BAD_REQUEST;
        const wallet = await ensureWallet(user.id).catch(() => null);
        return response(
          {
            message: error.message,
            code: error.code,
            balanceCents: wallet?.balanceCents ?? 0,
          },
          status,
        );
      }
      return handleError('Wallet - Charge', error as Error);
    }
  } catch (error) {
    return handleError('Wallet - Charge', error as Error);
  }
}
