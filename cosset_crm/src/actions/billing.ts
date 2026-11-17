import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type BillingProvider = 'stripe' | 'paypal';
export type PaidPlanType = 'PAID' | 'EXTRA-PAID';
export type AccountPlanType = 'FREE' | PaidPlanType;

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

export type BillingCustomer = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  plan?: string | null;
  role?: string | null;
  businessAccountRequestedAt?: string | null;
};

export type CustomerPaymentOverview = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  photoURL?: string | null;
  role?: string | null;
  state?: string | null;
  plan?: string | null;
  walletBalanceCents: number;
  walletCurrency: string;
  billingProvider?: BillingProvider | null;
  billingStatus?: string | null;
  billingPlan?: string | null;
  billingAmountCents?: number | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  businessAccountRequestedAt?: string | null;
};

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
};

export function useGetPaymentCustomers(limit: number = 100, offset: number = 0, enabled: boolean = true) {
  const url = enabled
    ? `${endpoints.admin.customers.payments}?limit=${limit}&offset=${offset}`
    : null;

  const { data, isLoading, error, isValidating, mutate: mutateList } = useSWR<{
    customers?: CustomerPaymentOverview[];
  }>(url, fetcher, {
    ...swrOptions,
    dedupingInterval: 2000,
  });

  return useMemo(
    () => ({
      customers: data?.customers || [],
      customersLoading: isLoading,
      customersError: error,
      customersValidating: isValidating,
      refreshCustomers: () => mutateList(),
    }),
    [data?.customers, error, isLoading, isValidating, mutateList]
  );
}

export function useGetCustomerBilling(customerId: string, enabled: boolean = true) {
  const url =
    enabled && customerId ? endpoints.admin.customers.billing(customerId) : null;

  const { data, isLoading, error, isValidating, mutate: mutateBilling } = useSWR<{
    customer?: BillingCustomer;
    billing?: CustomerBillingSummary;
    payments?: CustomerPayment[];
  }>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      customer: data?.customer || null,
      billing: data?.billing || null,
      payments: data?.payments || [],
      paymentsLoading: isLoading,
      paymentsError: error,
      paymentsValidating: isValidating,
      refreshBilling: () => mutateBilling(),
    }),
    [data?.billing, data?.customer, data?.payments, error, isLoading, isValidating, mutateBilling]
  );
}

export async function updateCustomerBillingPlan(customerId: string, plan: AccountPlanType) {
  const res = await axios.put(endpoints.admin.customers.billing(customerId), { plan });
  await mutate(endpoints.admin.customers.billing(customerId));
  mutate(
    (key) => typeof key === 'string' && key.startsWith(endpoints.user.list),
    undefined,
    { revalidate: true }
  );
  mutate(
    (key) => typeof key === 'string' && key.startsWith(endpoints.admin.customers.payments),
    undefined,
    { revalidate: true }
  );
  return res.data as {
    customer?: BillingCustomer;
    billing?: CustomerBillingSummary;
    message?: string;
  };
}
