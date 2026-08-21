import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

import type { BillingProvider } from 'src/actions/billing';
import type { CinemaWatchQuote, WalletLedgerEntry, WalletSummary } from 'src/types/wallet';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
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

export async function refreshWallet() {
  await mutate(endpoints.wallet.root);
  await mutate(endpoints.auth.me);
}

export async function createWalletTopupSession(
  amountCents: number,
  provider: BillingProvider = 'stripe',
) {
  const res = await axios.post(endpoints.wallet.topup, { amountCents, provider });
  return res.data as {
    url?: string;
    sessionId?: string;
    orderId?: string;
    provider?: BillingProvider;
    message?: string;
  };
}

export async function confirmWalletTopup(input: {
  provider: BillingProvider;
  sessionId?: string;
  orderId?: string;
  token?: string;
}) {
  const res = await axios.post(endpoints.wallet.confirm, input);
  return res.data as {
    wallet?: WalletSummary;
    alreadyApplied?: boolean;
    message?: string;
  };
}

export async function chargeCinemaWatch(screeningId: number) {
  const res = await axios.post(endpoints.wallet.charge, {
    kind: 'cinema_watch',
    screeningId,
  });
  return res.data as {
    wallet?: WalletSummary;
    quote?: CinemaWatchQuote;
    message?: string;
    code?: string;
    balanceCents?: number;
  };
}

export function useGetWallet(enabled: boolean = true) {
  const { data, isLoading, error, isValidating } = useSWR<{
    wallet?: WalletSummary;
    ledger?: WalletLedgerEntry[];
  }>(enabled ? endpoints.wallet.root : null, fetcher, swrOptions);

  return useMemo(
    () => ({
      wallet: data?.wallet || { balanceCents: 0, currency: 'usd' },
      ledger: data?.ledger || [],
      walletLoading: isLoading,
      walletError: error,
      walletValidating: isValidating,
    }),
    [data?.ledger, data?.wallet, error, isLoading, isValidating],
  );
}
