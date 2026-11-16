import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

import type { WalletLedgerEntry, WalletSummary } from 'src/types/wallet';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
};

export function formatWalletMoney(amountCents: number, currency = 'usd') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format((amountCents || 0) / 100);
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(2)}`;
  }
}

export function useGetCustomerWallet(customerId: string, enabled: boolean = true) {
  const url =
    enabled && customerId ? endpoints.admin.customers.wallet(customerId) : null;

  const { data, isLoading, error, isValidating, mutate: mutateWallet } = useSWR<{
    wallet?: WalletSummary;
    ledger?: WalletLedgerEntry[];
  }>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      wallet: data?.wallet || { balanceCents: 0, currency: 'usd' },
      ledger: data?.ledger || [],
      walletLoading: isLoading,
      walletError: error,
      walletValidating: isValidating,
      refreshWallet: () => mutateWallet(),
    }),
    [data?.ledger, data?.wallet, error, isLoading, isValidating, mutateWallet]
  );
}

export async function adjustCustomerWallet(
  customerId: string,
  input: {
    amountCents: number;
    direction: 'credit' | 'debit';
    description?: string;
  }
) {
  const res = await axios.post(endpoints.admin.customers.wallet(customerId), input);
  await mutate(endpoints.admin.customers.wallet(customerId));
  mutate(
    (key) => typeof key === 'string' && key.startsWith(endpoints.admin.customers.payments),
    undefined,
    { revalidate: true }
  );
  return res.data as {
    wallet?: WalletSummary;
    ledger?: WalletLedgerEntry[];
    message?: string;
  };
}
