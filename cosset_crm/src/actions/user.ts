import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type UsersData = {
  users: Record<string, any>[];
};

type UserData = {
  user: Record<string, any>;
};

export type CustomerUpdatePayload = {
  state?: string;
  role?: string;
  plan?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  about?: string | null;
  isPublic?: boolean;
};

export type CustomerCreatePayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  plan?: string;
  state?: string;
  country?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  about?: string;
  isPublic?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

/**
 * Fetch users list for admin customers page
 */
export function useGetUsers(limit: number = 100, offset: number = 0, enabled: boolean = true) {
  const usersEndpoint = enabled ? `${endpoints.user.list}?limit=${limit}&offset=${offset}` : null;

  const { data, isLoading, error, isValidating } = useSWR<UsersData>(
    usersEndpoint,
    fetcher,
    swrOptions
  );

  return useMemo(
    () => ({
      users: data?.users || [],
      usersLoading: isLoading,
      usersError: error,
      usersValidating: isValidating,
      usersEmpty: !isLoading && !data?.users?.length,
    }),
    [data?.users, error, isLoading, isValidating]
  );
}

/**
 * Fetch a single customer for the admin edit page
 */
export function useGetCustomer(customerId: string | number | '', enabled: boolean = true) {
  const url = enabled && customerId ? endpoints.user.details(customerId) : null;

  const { data, isLoading, error, isValidating, mutate: mutateCustomer } = useSWR<UserData>(
    url,
    fetcher,
    swrOptions
  );

  return useMemo(
    () => ({
      customer: data?.user || null,
      customerLoading: isLoading,
      customerError: error,
      customerValidating: isValidating,
      refreshCustomer: () => mutateCustomer(),
    }),
    [data?.user, error, isLoading, isValidating, mutateCustomer]
  );
}

/**
 * Create a customer from the admin customers pages
 */
export async function createCustomer(payload: CustomerCreatePayload) {
  try {
    const response = await axios.post(endpoints.user.root, payload);

    mutate(
      (key) => typeof key === 'string' && key.startsWith(endpoints.user.list),
      undefined,
      { revalidate: true }
    );

    return response.data?.user || response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create customer'));
  }
}

/**
 * Update a customer from the admin customers pages
 */
export async function updateCustomer(customerId: string | number, updates: CustomerUpdatePayload) {
  try {
    const response = await axios.put(endpoints.user.details(customerId), updates);

    mutate(
      (key) => typeof key === 'string' && key.startsWith(endpoints.user.list),
      undefined,
      { revalidate: true }
    );
    mutate(endpoints.user.details(customerId));

    return response.data?.user || response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update customer'));
  }
}

export async function getS3SignedUrl(key?: string | null): Promise<string> {
  if (!key) return '';

  try {
    const res = await axios.get(endpoints.upload.image, { params: { key } });
    return res.data?.url || '';
  } catch (error) {
    console.error('Failed to get S3 signed URL:', error);
    return '';
  }
}
