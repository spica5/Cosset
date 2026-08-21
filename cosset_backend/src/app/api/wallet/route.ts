import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import {
  ensureWallet,
  listWalletLedger,
  WALLET_CURRENCY,
} from 'src/models/wallet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const limit = Number.parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
    const wallet = await ensureWallet(user.id);
    const ledger = await listWalletLedger(user.id, Number.isFinite(limit) ? limit : 20);

    return response(
      {
        wallet: {
          balanceCents: wallet.balanceCents,
          currency: wallet.currency || WALLET_CURRENCY,
        },
        ledger,
      },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
    }
    return handleError('Wallet - Get', error as Error);
  }
}
