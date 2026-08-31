import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type IFriendActivityNotifyPref = {
  id: number;
  subscriberId: string;
  friendId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type PrefsResponse = {
  prefs: IFriendActivityNotifyPref[];
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const buildPrefsUrl = (subscriberId?: string) => {
  const id = (subscriberId || '').trim();
  if (!id) return null;
  const params = new URLSearchParams({ subscriberId: id });
  return `${endpoints.friend.activityNotify}?${params.toString()}`;
};

export function useGetFriendActivityNotifyPrefs(subscriberId?: string, enabled: boolean = true) {
  const url = enabled ? buildPrefsUrl(subscriberId) : null;

  const { data, isLoading, error, isValidating } = useSWR<PrefsResponse>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(() => {
    const prefs = data?.prefs || [];
    const enabledFriendIds = new Set(
      prefs.filter((pref) => pref.enabled).map((pref) => pref.friendId),
    );

    return {
      prefs,
      enabledFriendIds,
      prefsLoading: isLoading,
      prefsError: error,
      prefsValidating: isValidating,
    };
  }, [data?.prefs, error, isLoading, isValidating]);

  return memoizedValue;
}

export async function setFriendActivityNotify(
  subscriberId: string,
  friendId: string,
  enabled: boolean,
) {
  const res = await axiosInstance.patch(endpoints.friend.activityNotify, {
    subscriberId,
    friendId,
    enabled,
  });

  await mutate(buildPrefsUrl(subscriberId));

  return res.data;
}
