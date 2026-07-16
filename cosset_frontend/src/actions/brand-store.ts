import type { IBrandStore, IBrandCategory, IBrandProduct } from 'src/types/brand-store';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const STORE_LIST_ENDPOINT = endpoints.brandStore.list;
const STORE_MINE_ENDPOINT = endpoints.brandStore.mine;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const revalidateStoreCaches = async (storeId?: string | number) => {
  await mutate(STORE_LIST_ENDPOINT);
  await mutate(STORE_MINE_ENDPOINT);
  if (storeId !== undefined) {
    await mutate(endpoints.brandStore.details(storeId));
    await mutate(endpoints.brandStore.categories(storeId));
    await mutate(endpoints.brandStore.products(storeId));
  }
};

type StoresData = { stores?: IBrandStore[]; store?: IBrandStore | null };
type StoreData = { store?: IBrandStore };
type CategoriesData = { categories?: IBrandCategory[] };
type ProductsData = { products?: IBrandProduct[] };

export function useGetBrandStores() {
  const { data, isLoading, error, isValidating } = useSWR<StoresData>(
    STORE_LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      stores: data?.stores || [],
      storesLoading: isLoading,
      storesError: error,
      storesValidating: isValidating,
      storesEmpty: !isLoading && !(data?.stores || []).length,
    }),
    [data?.stores, error, isLoading, isValidating],
  );
}

export function useGetMyBrandStore(enabled: boolean = true) {
  const { data, isLoading, error, isValidating } = useSWR<StoresData>(
    enabled ? STORE_MINE_ENDPOINT : null,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      store: data?.store || data?.stores?.[0] || null,
      storeLoading: isLoading,
      storeError: error,
      storeValidating: isValidating,
    }),
    [data?.store, data?.stores, error, isLoading, isValidating],
  );
}

export function useGetBrandStore(id: string | number | '') {
  const url = id ? endpoints.brandStore.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<StoreData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      store: data?.store,
      storeLoading: isLoading,
      storeError: error,
      storeValidating: isValidating,
    }),
    [data?.store, error, isLoading, isValidating],
  );
}

export function useGetBrandCategories(storeId: string | number | '') {
  const url = storeId ? endpoints.brandStore.categories(storeId) : null;
  const { data, isLoading, error, isValidating } = useSWR<CategoriesData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      categories: data?.categories || [],
      categoriesLoading: isLoading,
      categoriesError: error,
      categoriesValidating: isValidating,
    }),
    [data?.categories, error, isLoading, isValidating],
  );
}

export function useGetBrandProducts(storeId: string | number | '') {
  const url = storeId ? endpoints.brandStore.products(storeId) : null;
  const { data, isLoading, error, isValidating } = useSWR<ProductsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      products: data?.products || [],
      productsLoading: isLoading,
      productsError: error,
      productsValidating: isValidating,
    }),
    [data?.products, error, isLoading, isValidating],
  );
}

export async function createBrandStore(
  store: Omit<
    IBrandStore,
    'id' | 'ownerCustomerId' | 'createdAt' | 'updatedAt' | 'categoryCount' | 'productCount'
  >,
) {
  const res = await axios.post(endpoints.brandStore.add, { store });
  await revalidateStoreCaches(res.data?.store?.id);
  return res.data?.store as IBrandStore;
}

export async function updateBrandStore(id: string | number, updates: Partial<IBrandStore>) {
  const res = await axios.put(endpoints.brandStore.update(id), { updates });
  await revalidateStoreCaches(id);
  return res.data?.store as IBrandStore;
}

export async function deleteBrandStore(id: string | number) {
  const res = await axios.delete(endpoints.brandStore.delete(id));
  await revalidateStoreCaches();
  return res.data;
}

export async function createBrandCategory(
  storeId: string | number,
  category: Partial<IBrandCategory> & { name: string },
) {
  const res = await axios.post(endpoints.brandStore.categories(storeId), { category });
  await revalidateStoreCaches(storeId);
  return res.data?.category as IBrandCategory;
}

export async function updateBrandCategory(
  storeId: string | number,
  categoryId: string | number,
  updates: Partial<IBrandCategory>,
) {
  const res = await axios.put(endpoints.brandStore.category(storeId, categoryId), { updates });
  await revalidateStoreCaches(storeId);
  return res.data?.category as IBrandCategory;
}

export async function deleteBrandCategory(storeId: string | number, categoryId: string | number) {
  const res = await axios.delete(endpoints.brandStore.category(storeId, categoryId));
  await revalidateStoreCaches(storeId);
  return res.data;
}

export async function createBrandProduct(
  storeId: string | number,
  product: Partial<IBrandProduct> & { name: string; categoryId: number },
) {
  try {
    const res = await axios.post(endpoints.brandStore.products(storeId), { product });
    await revalidateStoreCaches(storeId);
    return res.data?.product as IBrandProduct;
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to save product')
          : 'Failed to save product';
    throw new Error(message);
  }
}

export async function updateBrandProduct(
  storeId: string | number,
  productId: string | number,
  updates: Partial<IBrandProduct>,
) {
  const res = await axios.put(endpoints.brandStore.product(storeId, productId), { updates });
  await revalidateStoreCaches(storeId);
  return res.data?.product as IBrandProduct;
}

export async function deleteBrandProduct(storeId: string | number, productId: string | number) {
  const res = await axios.delete(endpoints.brandStore.product(storeId, productId));
  await revalidateStoreCaches(storeId);
  return res.data;
}
