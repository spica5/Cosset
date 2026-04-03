import type { ICoffeeShopItem } from 'src/types/coffee-shop';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const COFFEE_SHOP_LIST_ENDPOINT = endpoints.coffeeShop.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type CoffeeShopsData = {
  coffeeShops?: ICoffeeShopItem[];
};

type CoffeeShopData = {
  coffeeShop?: ICoffeeShopItem;
};

export function useGetCoffeeShops() {
  const { data, isLoading, error, isValidating } = useSWR<CoffeeShopsData>(
    COFFEE_SHOP_LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      coffeeShops: data?.coffeeShops || [],
      coffeeShopsLoading: isLoading,
      coffeeShopsError: error,
      coffeeShopsValidating: isValidating,
      coffeeShopsEmpty: !isLoading && !(data?.coffeeShops || []).length,
    }),
    [data?.coffeeShops, error, isLoading, isValidating],
  );
}

export function useGetCoffeeShop(id: string | number | '') {
  const url = id ? endpoints.coffeeShop.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<CoffeeShopData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      coffeeShop: data?.coffeeShop,
      coffeeShopLoading: isLoading,
      coffeeShopError: error,
      coffeeShopValidating: isValidating,
    }),
    [data?.coffeeShop, error, isLoading, isValidating],
  );
}

export async function createCoffeeShop(
  coffeeShop: Omit<ICoffeeShopItem, 'id' | 'createdAt'>,
) {
  const res = await axios.post(endpoints.coffeeShop.add, { coffeeShop });
  await mutate(COFFEE_SHOP_LIST_ENDPOINT);
  return res.data;
}

export async function updateCoffeeShop(id: string | number, updates: Partial<ICoffeeShopItem>) {
  const res = await axios.put(endpoints.coffeeShop.update(id), { updates });

  const updatedCoffeeShop = res.data?.coffeeShop as ICoffeeShopItem | undefined;
  const normalizedId = String(id);

  if (updatedCoffeeShop) {
    mutate<CoffeeShopsData>(
      COFFEE_SHOP_LIST_ENDPOINT,
      (current) => {
        const currentList = current?.coffeeShops || [];
        return {
          ...current,
          coffeeShops: currentList.map((item) =>
            String(item.id) === normalizedId ? { ...item, ...updatedCoffeeShop } : item,
          ),
        };
      },
      false,
    );

    mutate<CoffeeShopData>(
      endpoints.coffeeShop.details(id),
      (current) => ({
        ...current,
        coffeeShop: current?.coffeeShop
          ? { ...current.coffeeShop, ...updatedCoffeeShop }
          : updatedCoffeeShop,
      }),
      false,
    );
  }

  await Promise.all([
    mutate(COFFEE_SHOP_LIST_ENDPOINT),
    mutate(endpoints.coffeeShop.details(id)),
  ]);
  return res.data;
}

export async function deleteCoffeeShop(id: string | number) {
  const res = await axios.delete(endpoints.coffeeShop.delete(id));

  const normalizedId = String(id);
  mutate<CoffeeShopsData>(
    COFFEE_SHOP_LIST_ENDPOINT,
    (current) => ({
      ...current,
      coffeeShops: (current?.coffeeShops || []).filter((item) => String(item.id) !== normalizedId),
    }),
    false,
  );

  await mutate(COFFEE_SHOP_LIST_ENDPOINT);
  return res.data;
}
