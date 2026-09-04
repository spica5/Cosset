import type {
  IBrandStore,
  IBrandCategory,
  IBrandProduct,
  IBrandProductOrder,
  IBrandProductOrderStatus,
  IBrandProductWishlistItem,
  IBrandStoreWishlistClientItem,
} from 'src/types/brand-store';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const STORE_LIST_ENDPOINT = endpoints.brandStore.list;
const STORE_MINE_ENDPOINT = endpoints.brandStore.mine;
const STORE_ORDERS_ENDPOINT = endpoints.brandStore.orders;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export const revalidateBrandStoreList = async () => {
  try {
    await Promise.all([
      mutate(STORE_LIST_ENDPOINT, undefined, { revalidate: true }),
      mutate(STORE_MINE_ENDPOINT, undefined, { revalidate: true }),
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/brand-store'),
        undefined,
        { revalidate: true }
      ),
    ]);
  } catch {
    // Ignore cache refresh failures; CRUD already succeeded on the server.
  }
};

const revalidateStoreCaches = async (storeId?: string | number) => {
  await revalidateBrandStoreList();

  if (storeId !== undefined) {
    await Promise.all([
      mutate(endpoints.brandStore.details(storeId), undefined, { revalidate: true }),
      mutate(endpoints.brandStore.categories(storeId), undefined, { revalidate: true }),
      mutate(endpoints.brandStore.products(storeId), undefined, { revalidate: true }),
    ]);
  }
};

type StoresData = { stores?: IBrandStore[]; store?: IBrandStore | null };
type StoreData = { store?: IBrandStore };
type CategoriesData = { categories?: IBrandCategory[] };
type ProductsData = { products?: IBrandProduct[] };
type OrdersData = { orders?: IBrandProductOrder[]; store?: IBrandStore | null };

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

export function useGetMyBrandProductOrders(enabled: boolean = true) {
  const { data, isLoading, error, isValidating } = useSWR<OrdersData>(
    enabled ? STORE_ORDERS_ENDPOINT : null,
    fetcher,
    { ...swrOptions, revalidateIfStale: true },
  );

  return useMemo(
    () => ({
      orders: data?.orders || [],
      store: data?.store || null,
      ordersLoading: isLoading,
      ordersError: error,
      ordersValidating: isValidating,
      ordersEmpty: !isLoading && !(data?.orders || []).length,
    }),
    [data?.orders, data?.store, error, isLoading, isValidating],
  );
}

export async function purchaseBrandProduct(
  storeId: string | number,
  productId: string | number,
  options?: { quantity?: number; note?: string; displayName?: string },
) {
  try {
    const res = await axios.post(endpoints.brandStore.productOrder(storeId, productId), {
      quantity: options?.quantity ?? 1,
      note: options?.note,
      displayName: options?.displayName,
    });

    await mutate(STORE_ORDERS_ENDPOINT, undefined, { revalidate: true });
    return res.data?.order as IBrandProductOrder;
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to purchase product')
          : 'Failed to purchase product';
    throw new Error(message);
  }
}

export async function updateBrandProductOrderStatus(
  orderId: string | number,
  status: IBrandProductOrderStatus,
) {
  const res = await axios.put(STORE_ORDERS_ENDPOINT, { orderId, status });
  await mutate(STORE_ORDERS_ENDPOINT, undefined, { revalidate: true });
  return res.data?.order as IBrandProductOrder;
}

export async function createBrandClientOrder(payload: {
  productId: string | number;
  quantity?: number;
  note?: string;
  customerId?: string | number;
  customerName?: string;
  customerEmail?: string;
  price?: string;
  currency?: string;
}) {
  try {
    const res = await axios.post(STORE_ORDERS_ENDPOINT, payload);
    await mutate(STORE_ORDERS_ENDPOINT, undefined, { revalidate: true });
    return res.data?.order as IBrandProductOrder;
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to add client')
          : 'Failed to add client';
    throw new Error(message);
  }
}

export async function updateBrandClientOrder(
  orderId: string | number,
  payload: {
    productId: string | number;
    quantity?: number;
    note?: string;
    status?: IBrandProductOrderStatus;
    customerId?: string | number;
    customerName?: string;
    customerEmail?: string;
    price?: string;
    currency?: string;
  },
) {
  try {
    const res = await axios.put(STORE_ORDERS_ENDPOINT, { orderId, ...payload });
    await mutate(STORE_ORDERS_ENDPOINT, undefined, { revalidate: true });
    return res.data?.order as IBrandProductOrder;
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to update client')
          : 'Failed to update client';
    throw new Error(message);
  }
}

export async function deleteBrandClientOrder(orderId: string | number) {
  try {
    const res = await axios.delete(STORE_ORDERS_ENDPOINT, { data: { orderId } });
    await mutate(STORE_ORDERS_ENDPOINT, undefined, { revalidate: true });
    return res.data?.order as IBrandProductOrder;
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to remove client')
          : 'Failed to remove client';
    throw new Error(message);
  }
}

export async function createBrandStore(
  store: Omit<
    IBrandStore,
    'id' | 'ownerCustomerId' | 'createdAt' | 'updatedAt' | 'categoryCount' | 'productCount'
  >,
) {
  const res = await axios.post(endpoints.brandStore.add, { store });
  const created = res.data?.store as IBrandStore;

  if (created) {
    await mutate(
      STORE_LIST_ENDPOINT,
      (current: StoresData | undefined) => {
        const existing = current?.stores || [];
        const withoutDuplicate = existing.filter((item) => item.id !== created.id);
        return { stores: [created, ...withoutDuplicate] };
      },
      { revalidate: true }
    );

    await mutate(
      STORE_MINE_ENDPOINT,
      { stores: [created], store: created },
      { revalidate: true }
    );
  }

  await revalidateStoreCaches(created?.id);
  return created;
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

// ---- Favorites & visits ----

export async function fetchBrandStoreFavorites(): Promise<number[]> {
  try {
    const res = await axios.get(endpoints.brandStore.favorite);
    return (res.data?.favoriteIds || []).map(Number).filter((id: number) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export async function toggleBrandStoreFavorite(brandStoreId: number) {
  const res = await axios.post(endpoints.brandStore.favorite, { brandStoreId });
  await revalidateBrandStoreList();
  return res.data as { isFavorite: boolean; favoriteCount: number };
}

// ---- Product wishlist ----

export async function fetchBrandProductWishlist(options?: {
  storeId?: number;
  idsOnly?: boolean;
}): Promise<{ items: IBrandProductWishlistItem[]; productIds: number[] }> {
  try {
    const params = new URLSearchParams();
    if (options?.storeId) params.set('storeId', String(options.storeId));
    if (options?.idsOnly) params.set('idsOnly', '1');
    const query = params.toString();
    const res = await axios.get(
      query ? `${endpoints.brandStore.wishlist}?${query}` : endpoints.brandStore.wishlist,
    );

    const productIds = (res.data?.productIds || [])
      .map(Number)
      .filter((id: number) => Number.isFinite(id));
    const items = (res.data?.items || []) as IBrandProductWishlistItem[];

    return { items, productIds };
  } catch {
    return { items: [], productIds: [] };
  }
}

export async function toggleBrandProductWishlist(brandStoreId: number, productId: number) {
  const res = await axios.post(endpoints.brandStore.wishlist, { brandStoreId, productId });
  await revalidateBrandStoreList();
  return res.data as {
    isWishlisted: boolean;
    wishlistCount: number;
    productWishlistCount: number;
  };
}

type StoreWishlistClientsData = {
  items?: IBrandStoreWishlistClientItem[];
  clientCount?: number;
};

export function useGetMyBrandStoreWishlists(enabled = true) {
  const url = enabled ? `${endpoints.brandStore.wishlist}?forOwner=1` : null;

  const { data, isLoading, error, isValidating, mutate: mutateWishlists } = useSWR<StoreWishlistClientsData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      items: data?.items || [],
      clientCount: data?.clientCount ?? 0,
      wishlistsLoading: isLoading,
      wishlistsError: error,
      wishlistsValidating: isValidating,
      wishlistsEmpty: !isLoading && !(data?.items || []).length,
      refreshWishlists: () => mutateWishlists(),
    }),
    [data?.clientCount, data?.items, error, isLoading, isValidating, mutateWishlists],
  );
}

export async function updateBrandStoreWishlistNote(
  wishlistId: number,
  note: string,
  purchasedAt?: string | null,
  status?: string | null,
) {
  const res = await axios.patch(endpoints.brandStore.wishlist, {
    wishlistId,
    note,
    purchasedAt,
    status,
  });
  await mutate(`${endpoints.brandStore.wishlist}?forOwner=1`);
  return res.data?.item as IBrandStoreWishlistClientItem;
}

export async function recordBrandStoreView(brandStoreId: number) {
  try {
    const res = await axios.post(endpoints.brandStore.view, { brandStoreId });
    const totalViews =
      typeof res.data?.totalViews === 'number' ? res.data.totalViews : undefined;

    if (typeof totalViews === 'number') {
      await mutate(
        endpoints.brandStore.details(brandStoreId),
        (current: StoreData | undefined) =>
          current?.store
            ? { ...current, store: { ...current.store, totalViews } }
            : current,
        { revalidate: false },
      );
      await mutate(
        STORE_LIST_ENDPOINT,
        (current: StoresData | undefined) => {
          if (!current?.stores) return current;
          return {
            ...current,
            stores: current.stores.map((store) =>
              store.id === brandStoreId ? { ...store, totalViews } : store,
            ),
          };
        },
        { revalidate: false },
      );
      await mutate(
        STORE_MINE_ENDPOINT,
        (current: StoresData | undefined) => {
          if (!current) return current;
          const patch = (store: IBrandStore | null | undefined) =>
            store && store.id === brandStoreId ? { ...store, totalViews } : store;
          return {
            ...current,
            store: patch(current.store) ?? current.store,
            stores: current.stores?.map((store) => patch(store) || store),
          };
        },
        { revalidate: false },
      );
    }

    return res.data as {
      totalViews: number;
      alreadyViewed: boolean;
      viewedAt: string | null;
    };
  } catch {
    return null;
  }
}
