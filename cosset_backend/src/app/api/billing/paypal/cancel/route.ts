import type { NextRequest } from 'next/server';

import { getCustomerBillingSummary, syncCustomerBilling } from '@/models/payments';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { cancelPayPalSubscription, isPayPalConfigured } from 'src/utils/paypal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return response({ message: 'PayPal is not configured' }, STATUS.BAD_REQUEST);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const billing = await getCustomerBillingSummary(user.id);
    if (billing.provider !== 'paypal' || !billing.externalSubscriptionId) {
      return response({ message: 'No active PayPal subscription found' }, STATUS.BAD_REQUEST);
    }

    await cancelPayPalSubscription(billing.externalSubscriptionId);

    await syncCustomerBilling({
      customerId: user.id,
      provider: 'paypal',
      plan: 'FREE',
      amountCents: 0,
      status: 'canceled',
      providerCustomerId: billing.providerCustomerId,
      externalCheckoutId: billing.externalSubscriptionId,
      externalSubscriptionId: billing.externalSubscriptionId,
      currentPeriodEnd: null,
      metadata: { source: 'cancel-api' },
    });

    return response({ canceled: true, plan: 'FREE' }, STATUS.OK);
  } catch (error) {
    return handleError('Billing - PayPal Cancel', error as Error);
  }
}
