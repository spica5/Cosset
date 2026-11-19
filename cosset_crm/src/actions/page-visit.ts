import useSWR from 'swr';
import { useMemo } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 15000,
};

export type PageVisitStat = {
  pageKey: string;
  label: string;
  totalVisits: number;
  uniqueVisitors: number;
  updatedAt: string | number | Date | null;
};

export type PageVisitCustomerStat = {
  customerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  photoURL: string | null;
  plan: string | null;
  role: string | null;
  totalVisits: number;
  pagesVisited: number;
  lastVisitedAt: string | number | Date | null;
};

export type PageVisitDailyStat = {
  visitDate: string;
  pageKey: string;
  label: string;
  visitCount: number;
};

type PageVisitStatsData = {
  stats?: PageVisitStat[];
  customers?: PageVisitCustomerStat[];
  daily?: PageVisitDailyStat[];
};

export type PageVisitCustomerPageStat = {
  pageKey: string;
  label: string;
  visitCount: number;
  firstVisitedAt: string | number | Date | null;
  lastVisitedAt: string | number | Date | null;
};

export type PageVisitCustomerDetail = {
  customerId: string;
  totalVisits: number;
  pagesVisited: number;
  lastVisitedAt: string | number | Date | null;
  pages: PageVisitCustomerPageStat[];
};

type PageVisitCustomerDetailData = {
  customer?: PageVisitCustomerDetail;
};

export function useGetPageVisitStats(enabled: boolean = true) {
  const url = enabled ? `${endpoints.pageVisit.stats}?days=14&customerLimit=50` : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR<PageVisitStatsData>(
    url,
    fetcher,
    {
      ...swrOptions,
      // Always re-fetch when the dashboard mounts so CRM sees latest frontend visits.
      revalidateOnMount: true,
    },
  );

  return useMemo(
    () => ({
      stats: data?.stats || [],
      customers: data?.customers || [],
      daily: data?.daily || [],
      statsLoading: isLoading,
      statsError: error,
      statsValidating: isValidating,
      refreshStats: () => mutate(undefined, { revalidate: true }),
    }),
    [data?.customers, data?.daily, data?.stats, error, isLoading, isValidating, mutate],
  );
}

export function useGetCustomerPageVisits(customerId?: string | null, enabled: boolean = true) {
  const normalizedId = String(customerId || '').trim();
  const url = enabled && normalizedId ? endpoints.pageVisit.customer(normalizedId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR<PageVisitCustomerDetailData>(
    url,
    fetcher,
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return useMemo(
    () => ({
      detail: data?.customer || null,
      detailLoading: isLoading,
      detailError: error,
      detailValidating: isValidating,
      refreshDetail: () => mutate(undefined, { revalidate: true }),
    }),
    [data?.customer, error, isLoading, isValidating, mutate],
  );
}

export async function fetchCustomerPageVisits(
  customerId: string | number,
): Promise<PageVisitCustomerDetail | null> {
  const res = await axios.get<PageVisitCustomerDetailData>(
    endpoints.pageVisit.customer(customerId),
  );
  return res.data?.customer || null;
}
