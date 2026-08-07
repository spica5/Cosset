import type { NextRequest } from 'next/server';

import { getCustomerBillingSummary, listCustomerPayments } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const [payments, billing] = await Promise.all([
      listCustomerPayments(user.id, Number.isNaN(limit) ? 50 : limit, Number.isNaN(offset) ? 0 : offset),
      getCustomerBillingSummary(user.id),
    ]);

    return response({ payments, billing }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - Payments list', error as Error);
  }
}
