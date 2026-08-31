import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

type CinemaNotificationPrefResponse = {
  pref: {
    customerId: string;
    notifySchedule: boolean;
    pushReady?: boolean;
  };
  testSent?: boolean;
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const buildPrefsUrl = () => {
  if (typeof window === 'undefined') return endpoints.cinema.notificationPrefs;
  const params = new URLSearchParams({ origin: window.location.origin });
  return `${endpoints.cinema.notificationPrefs}?${params.toString()}`;
};

export function useGetCinemaNotificationPrefs(enabled: boolean = true) {
  const url = enabled ? buildPrefsUrl() : null;

  const { data, isLoading, error, isValidating } = useSWR<CinemaNotificationPrefResponse>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      notifySchedule: Boolean(data?.pref?.notifySchedule),
      pushReady: Boolean(data?.pref?.pushReady),
      prefsLoading: isLoading,
      prefsError: error,
      prefsValidating: isValidating,
    }),
    [data?.pref?.notifySchedule, data?.pref?.pushReady, error, isLoading, isValidating],
  );
}

export async function setCinemaNotifySchedule(notifySchedule: boolean, sendTest: boolean = false) {
  const res = await axiosInstance.patch(endpoints.cinema.notificationPrefs, {
    notifySchedule,
    sendTest,
  });
  await mutate(buildPrefsUrl());
  return res.data as CinemaNotificationPrefResponse;
}
