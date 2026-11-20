import type { NextRequest } from 'next/server';

import { getUserById, updateUserPlan, type UserPlanType } from '@/models/users';
import {
  syncCustomerBilling,
  listCustomerPayments,
  getCustomerBillingSummary,
} from '@/models/payments';

import { STRIPE_PLANS } from 'src/utils/stripe';
import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, response, handleError } from 'src/utils/response';

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
  paidAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    plan: user.plan || 'FREE',
    role: user.role || 'user',
    businessAccountRequestedAt: user.businessAccountRequestedAt || null,
    paidAt: user.paidAt || null,
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

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (plan === 'FREE') {
      const existing = await getCustomerBillingSummary(customerId);
      if (existing.payment?.id) {
        await syncCustomerBilling({
          customerId,
          provider: existing.provider || 'stripe',
          plan: 'FREE',
          amountCents: 0,
          status: 'canceled',
          providerCustomerId: existing.providerCustomerId,
          priceId: existing.priceId,
          externalCheckoutId:
            existing.payment.externalCheckoutId || `admin-plan-${customerId}`,
          externalSubscriptionId: existing.externalSubscriptionId,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          metadata: { source: 'admin-billing', action: 'set-free' },
        });
      }
    } else {
      const existing = await getCustomerBillingSummary(customerId);
      await syncCustomerBilling({
        customerId,
        provider: existing.provider || 'stripe',
        plan,
        amountCents: STRIPE_PLANS[plan].unitAmount,
        status: 'active',
        providerCustomerId: existing.providerCustomerId,
        priceId: existing.priceId || STRIPE_PLANS[plan].priceId || null,
        externalCheckoutId:
          existing.payment?.externalCheckoutId || `admin-plan-${customerId}`,
        externalSubscriptionId:
          existing.externalSubscriptionId || `admin-plan-${customerId}`,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: { source: 'admin-billing', action: 'set-paid' },
      });
    }

    const billing = await getCustomerBillingSummary(customerId);
    const refreshedUser = await getUserById(customerId);

    return response(
      {
        customer: sanitizeUser(refreshedUser || updated),
        billing,
        message: `Plan updated to ${plan}. Provider subscriptions are not changed automatically.`,
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Admin customer billing - update', error as Error);
  }
}
