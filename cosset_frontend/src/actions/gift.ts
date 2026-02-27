import type { IGiftItem } from 'src/types/gift';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const GIFT_ENDPOINT = endpoints.gift.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type GiftsData = {
  gifts: IGiftItem[];
};

export function useGetGifts(userId?: string | number) {
  // append query parameter when filtering by owner
  const url = userId ? `${GIFT_ENDPOINT}?userId=${userId}` : GIFT_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<GiftsData>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      gifts: data?.gifts || [],
      giftsLoading: isLoading,
      giftsError: error,
      giftsValidating: isValidating,
      giftsEmpty: !isLoading && !data?.gifts.length,
    }),
    [data?.gifts, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type GiftData = {
  gift: IGiftItem;
};

export function useGetGift(giftId: string | number | '') {
  const url = giftId ? endpoints.gift.details(giftId) : null;

  const { data, isLoading, error, isValidating } = useSWR<GiftData>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      gift: data?.gift,
      giftLoading: isLoading,
      giftError: error,
      giftValidating: isValidating,
    }),
    [data?.gift, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGiftCount(
  userId?: string | number,
  openness?: string,
  category?: string
) {
  let key = endpoints.gift.count;
  const params: string[] = [];
  if (userId != null) params.push(`userId=${userId}`);
  if (openness != null) params.push(`openness=${encodeURIComponent(openness)}`);
  if (category != null) params.push(`category=${encodeURIComponent(category)}`);
  if (params.length) {
    key += `?${params.join('&')}`;
  }

  const { data, isLoading, error, isValidating } = useSWR<{ count: number }>(
    key,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      count: data?.count ?? 0,
      loading: isLoading,
      error,
      validating: isValidating,
    }),
    [data?.count, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export async function fetchGiftCount(
  userId?: string | number,
  openness?: string,
  category?: string
) {
  let url = endpoints.gift.count;
  const params: string[] = [];
  if (userId != null) params.push(`userId=${userId}`);
  if (openness != null) params.push(`openness=${encodeURIComponent(openness)}`);
  if (category != null) params.push(`category=${encodeURIComponent(category)}`);
  if (params.length) {
    url += `?${params.join('&')}`;
  }

  const res = await axios.get(url);
  return res.data.count;
}

// ----------------------------------------------------------------------

export async function createGift(gift: IGiftItem) {
  const data = { gift };
  const res = await axios.post(endpoints.gift.add, data);

  // Revalidate gifts list globally
  mutate(GIFT_ENDPOINT);
  // also revalidate per-user cache if userId is known
  if (gift.userId) {
    mutate(`${GIFT_ENDPOINT}?userId=${gift.userId}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateGift(id: string | number, updates: Partial<IGiftItem>) {
  const url = endpoints.gift.update(id);
  const data = { updates };
  const res = await axios.put(url, data);

  const returned = res.data as { gift?: IGiftItem };

  // Revalidate gift detail and list
  mutate(endpoints.gift.details(id));
  mutate(GIFT_ENDPOINT);

  if (returned.gift?.userId) {
    mutate(`${GIFT_ENDPOINT}?userId=${returned.gift.userId}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteGift(id: string | number, userId?: string | number) {
  const url = endpoints.gift.delete(id);
  const res = await axios.delete(url);

  // Revalidate gifts list globally
  mutate(GIFT_ENDPOINT);
  if (userId) {
    mutate(`${GIFT_ENDPOINT}?userId=${userId}`);
  }

  return res.data;
}