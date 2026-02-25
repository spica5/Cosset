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

export function useGetGifts() {
  const { data, isLoading, error, isValidating } = useSWR<GiftsData>(
    GIFT_ENDPOINT,
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

export async function createGift(gift: IGiftItem) {
  const data = { gift };
  const res = await axios.post(endpoints.gift.add, data);

  // Revalidate gifts list
  mutate(GIFT_ENDPOINT);

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateGift(id: string | number, gift: IGiftItem) {
  const url = endpoints.gift.update(id);
  const data = { gift };
  const res = await axios.put(url, data);

  // Revalidate gift detail and list
  mutate(endpoints.gift.details(id));
  mutate(GIFT_ENDPOINT);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteGift(id: string | number) {
  const url = endpoints.gift.delete(id);
  const res = await axios.delete(url);

  // Revalidate gifts list
  mutate(GIFT_ENDPOINT);

  return res.data;
}