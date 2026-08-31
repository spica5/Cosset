import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

type CinemaNotificationPrefResponse = {
  pref: {
    customerId: string;
    notifySchedule: boolean;
  };
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export function useGetCinemaNotificationPrefs(enabled: boolean = true) {
  const url = enabled ? endpoints.cinema.notificationPrefs : null;

  const { data, isLoading, error, isValidating } = useSWR<CinemaNotificationPrefResponse>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      notifySchedule: Boolean(data?.pref?.notifySchedule),
      prefsLoading: isLoading,
      prefsError: error,
      prefsValidating: isValidating,
    }),
    [data?.pref?.notifySchedule, error, isLoading, isValidating],
  );
}

export async function setCinemaNotifySchedule(notifySchedule: boolean) {
  const res = await axiosInstance.patch(endpoints.cinema.notificationPrefs, { notifySchedule });
  await mutate(endpoints.cinema.notificationPrefs);
  return res.data as CinemaNotificationPrefResponse;
}
