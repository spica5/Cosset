import type { NextRequest } from 'next/server';

import { getUserById, updateUserPlan, type UserPlanType } from '@/models/users';
import { getCustomerBillingSummary, listCustomerPayments } from '@/models/payments';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const CUSTOMER_PLANS = new Set(['FREE', 'PAID', 'EXTRA-PAID']);

function sanitizeUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  plan?: string | null;
  role?: string | null;
  businessAccountRequestedAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    plan: user.plan || 'FREE',
    role: user.role || 'user',
    businessAccountRequestedAt: user.businessAccountRequestedAt || null,
  };
}

/** GET /api/admin/customers/:id/billing — Admin billing summary + payment history */
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
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const [billing, payments] = await Promise.all([
      getCustomerBillingSummary(customerId),
      listCustomerPayments(customerId, limit, offset),
    ]);

    return response(
      {
        customer: sanitizeUser(customer),
        billing,
        payments,
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Admin customer billing - get', error as Error);
  }
}

/** PUT /api/admin/customers/:id/billing — Admin update Cosset plan */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const plan = String(body.plan || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-') as UserPlanType;

    if (!CUSTOMER_PLANS.has(plan)) {
      return response({ message: 'Invalid plan' }, STATUS.BAD_REQUEST);
    }

    const updated = await updateUserPlan(customerId, plan);
    const billing = await getCustomerBillingSummary(customerId);

    return response(
      {
        customer: sanitizeUser(updated),
        billing,
        message: `Plan updated to ${plan}. Provider subscriptions are not changed automatically.`,
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Admin customer billing - update', error as Error);
  }
}
