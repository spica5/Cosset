import type { NextRequest } from 'next/server';

import { createCustomerPayment, getLatestProviderCustomerId } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { getStripe, getFrontendAppUrl, isStripeConfigured } from 'src/utils/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return response(
        { message: 'Stripe is not configured. Set STRIPE_SECRET_KEY on the API server.' },
        STATUS.BAD_REQUEST,
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const stripe = getStripe();
    let providerCustomerId = (await getLatestProviderCustomerId(user.id, 'stripe')) || undefined;

    if (!providerCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
        metadata: {
          userId: user.id,
        },
      });
      providerCustomerId = customer.id;
      await createCustomerPayment({
        customerId: user.id,
        provider: 'stripe',
        plan: user.plan || 'FREE',
        amountCents: 0,
        status: 'pending',
        providerCustomerId,
        metadata: { source: 'portal-customer-create' },
      });
    }

    const appUrl = getFrontendAppUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: providerCustomerId,
      return_url: `${appUrl}/dashboard/settings/account`,
    });

    return response({ url: portalSession.url }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - Portal', error as Error);
  }
}
