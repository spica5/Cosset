import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const ME_ENDPOINT = endpoints.auth.me;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type MeData = {
  user: Record<string, any>;
};

type UsersData = {
  users: Record<string, any>[];
};

/**
 * Fetch current user profile data
 */
export function useGetCurrentUser() {
  const { data, isLoading, error, isValidating } = useSWR<MeData>(
    ME_ENDPOINT,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      user: data?.user,
      userLoading: isLoading,
      userError: error,
      userValidating: isValidating,
      userEmpty: !isLoading && !data?.user,
    }),
    [data?.user, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * Fetch users list for friend page
 */
export function useGetUsers(limit: number = 100, offset: number = 0) {
  const usersEndpoint = `${endpoints.user.list}?limit=${limit}&offset=${offset}`;

  const { data, isLoading, error, isValidating } = useSWR<UsersData>(
    usersEndpoint,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      users: data?.users || [],
      usersLoading: isLoading,
      usersError: error,
      usersValidating: isValidating,
      usersEmpty: !isLoading && !data?.users?.length,
    }),
    [data?.users, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * Update current user profile
 */
export async function updateCurrentUser(updatedData: Record<string, any>) {
  const response = await axios.put<MeData>(ME_ENDPOINT, updatedData);

  // Revalidate all user-related caches
  mutate(ME_ENDPOINT);

  return response.data.user;
}
