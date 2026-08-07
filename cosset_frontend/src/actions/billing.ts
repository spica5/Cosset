import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type PaidPlanType = 'PAID' | 'EXTRA-PAID';
export type BillingProvider = 'stripe' | 'paypal';

export type CustomerPayment = {
  id: number;
  customerId: string;
  provider: BillingProvider;
  plan: string;
  amountCents: number;
  currency: string;
  status: string;
  providerCustomerId?: string | null;
  priceId?: string | null;
  externalCheckoutId?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CustomerBillingSummary = {
  plan: string;
  provider: BillingProvider | null;
  providerCustomerId: string | null;
  externalSubscriptionId: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  status: string | null;
  payment?: CustomerPayment | null;
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export async function createBillingCheckoutSession(
  plan: PaidPlanType,
  provider: BillingProvider = 'stripe',
) {
  const endpoint =
    provider === 'paypal' ? endpoints.billing.paypalCheckout : endpoints.billing.checkout;
  const res = await axios.post(endpoint, { plan });
  return res.data as {
    url?: string;
    sessionId?: string;
    subscriptionId?: string;
    provider?: BillingProvider;
    updated?: boolean;
    plan?: PaidPlanType;
    message?: string;
  };
}

export async function createBillingPortalSession() {
  const res = await axios.post(endpoints.billing.portal);
  return res.data as { url?: string; message?: string };
}

export async function capturePayPalSubscription(subscriptionId: string) {
  const res = await axios.post(endpoints.billing.paypalCapture, { subscriptionId });
  return res.data as { status?: string; plan?: string; active?: boolean; message?: string };
}

export async function cancelPayPalSubscription() {
  const res = await axios.post(endpoints.billing.paypalCancel);
  return res.data as { canceled?: boolean; plan?: string; message?: string };
}

export async function refreshBillingUser() {
  await Promise.all([mutate(endpoints.auth.me), mutate(endpoints.billing.payments)]);
}

export function useGetCustomerPayments(enabled: boolean = true) {
  const { data, isLoading, error, isValidating } = useSWR<{
    payments?: CustomerPayment[];
    billing?: CustomerBillingSummary;
  }>(enabled ? endpoints.billing.payments : null, fetcher, swrOptions);

  return useMemo(
    () => ({
      payments: data?.payments || [],
      billing: data?.billing || null,
      paymentsLoading: isLoading,
      paymentsError: error,
      paymentsValidating: isValidating,
    }),
    [data?.billing, data?.payments, error, isLoading, isValidating],
  );
}
