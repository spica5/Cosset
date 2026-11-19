import type { NextRequest } from 'next/server';

import {
  getPageVisitStats,
  getPageVisitDailyStats,
  getPageVisitCustomerStats,
  getPageVisitStatsForCustomer,
} from 'src/models/page-visits';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function isAdminUser(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

/** **************************************
 * GET /api/page-visit/stats
 * Admin-only aggregates.
 * Optional ?customerId= returns that customer's page visit detail + chart data.
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user || !isAdminUser(user.role)) {
      return response({ message: 'Admin access required' }, STATUS.UNAUTHORIZED);
    }

    const customerId = String(req.nextUrl.searchParams.get('customerId') || '').trim();
    if (customerId) {
      const customer = await getPageVisitStatsForCustomer(customerId);
      return response({ customer }, STATUS.OK);
    }

    const daysParam = Number.parseInt(req.nextUrl.searchParams.get('days') || '14', 10);
    const customerLimitParam = Number.parseInt(
      req.nextUrl.searchParams.get('customerLimit') || '50',
      10,
    );

    const [stats, customers, daily] = await Promise.all([
      getPageVisitStats(),
      getPageVisitCustomerStats(customerLimitParam),
      getPageVisitDailyStats(daysParam),
    ]);

    return response({ stats, customers, daily }, STATUS.OK);
  } catch (error) {
    return handleError('Page visit - Stats', error as Error);
  }
}
