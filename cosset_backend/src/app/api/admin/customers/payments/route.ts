import type { NextRequest } from 'next/server';

import { listCustomerPaymentOverviews } from '@/models/payments';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** GET /api/admin/customers/payments — Admin customer payment overview list */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const customers = await listCustomerPaymentOverviews(limit, offset);

    return response({ customers }, STATUS.OK);
  } catch (error) {
    console.error('[Admin customer payments - list]:', error);
    return handleError('Admin customer payments - list', error as Error);
  }
}
