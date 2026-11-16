import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import {
  creditWallet,
  debitWallet,
  ensureWallet,
  listWalletLedger,
} from '@/models/wallet';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function toWalletSummary(wallet: { balanceCents: number; currency: string }) {
  return {
    balanceCents: wallet.balanceCents,
    currency: wallet.currency || 'usd',
  };
}

/** GET /api/admin/customers/:id/wallet — Admin wallet + ledger for a customer */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const customerId = String(id || '').trim();
    if (!customerId) {
      return response({ message: 'Customer ID is required' }, STATUS.BAD_REQUEST);
    }

    const customer = await getUserById(customerId);
    if (!customer) {
      return response({ message: 'Customer not found' }, STATUS.NOT_FOUND);
    }

    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    const wallet = await ensureWallet(customerId);
    const ledger = await listWalletLedger(customerId, limit);

    return response(
      {
        wallet: toWalletSummary(wallet),
        ledger,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          plan: customer.plan,
          role: customer.role,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Admin customer wallet - get', error as Error);
  }
}

/** POST /api/admin/customers/:id/wallet — Admin credit/debit wallet */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const customerId = String(id || '').trim();
    if (!customerId) {
      return response({ message: 'Customer ID is required' }, STATUS.BAD_REQUEST);
    }

    const customer = await getUserById(customerId);
    if (!customer) {
      return response({ message: 'Customer not found' }, STATUS.NOT_FOUND);
    }

    const body = await req.json();
    const amountCents = Math.trunc(Number(body.amountCents));
    const direction = String(body.direction || 'credit')
      .trim()
      .toLowerCase();
    const description =
      String(body.description || '').trim() ||
      (direction === 'debit' ? 'Admin wallet debit' : 'Admin wallet credit');

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return response({ message: 'Amount must be greater than 0' }, STATUS.BAD_REQUEST);
    }

    if (amountCents > 20000) {
      return response({ message: 'Amount cannot exceed $200.00' }, STATUS.BAD_REQUEST);
    }

    if (direction !== 'credit' && direction !== 'debit') {
      return response({ message: 'direction must be credit or debit' }, STATUS.BAD_REQUEST);
    }

    const result =
      direction === 'debit'
        ? await debitWallet({
            customerId,
            amountCents,
            kind: 'refund',
            description,
            metadata: { source: 'crm_admin', adminId: auth.user.id },
          })
        : await creditWallet({
            customerId,
            amountCents,
            kind: 'topup',
            description,
            metadata: { source: 'crm_admin', adminId: auth.user.id },
          });

    const ledger = await listWalletLedger(customerId, 20);

    return response(
      {
        wallet: toWalletSummary(result.wallet),
        ledger,
        entry: result.ledger,
      },
      STATUS.OK
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update wallet';
    if (message.toLowerCase().includes('insufficient')) {
      return response({ message: 'Insufficient wallet balance' }, STATUS.BAD_REQUEST);
    }
    return handleError('Admin customer wallet - update', error as Error);
  }
}
