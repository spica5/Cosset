import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const COLLECTION_ITEM_LIST_ENDPOINT = endpoints.collectionItem.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type CollectionItemsData = {
  items?: ICollectionDrawerItem[];
  collectionItems?: ICollectionDrawerItem[];
};

type CollectionItemData = {
  item?: ICollectionDrawerItem;
  collectionItem?: ICollectionDrawerItem;
};

type ViewedCollectionItemsData = {
  viewedCollectionItemIds?: number[];
};

const getCollectionItems = (data?: CollectionItemsData) => data?.collectionItems || data?.items || [];

const toCollectionItemsData = (items: ICollectionDrawerItem[]): CollectionItemsData => ({
  collectionItems: items,
  items,
});

const upsertCollectionItemInList = (
  items: ICollectionDrawerItem[],
  nextItem: ICollectionDrawerItem,
) => {
  if (nextItem.id === undefined || nextItem.id === null) {
    return [nextItem, ...items];
  }

  const existingIndex = items.findIndex((item) => String(item.id) === String(nextItem.id));

  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  return items.map((item, index) => (index === existingIndex ? nextItem : item));
};

const removeCollectionItemFromList = (items: ICollectionDrawerItem[], id: string | number) =>
  items.filter((item) => String(item.id) !== String(id));

const mutateCollectionItemsList = (
  url: string | null,
  updater: (items: ICollectionDrawerItem[]) => ICollectionDrawerItem[],
) => {
  if (!url) {
    return;
  }

  mutate<CollectionItemsData>(
    url,
    (current) => toCollectionItemsData(updater(getCollectionItems(current))),
    { revalidate: false },
  );
};

const buildCollectionItemsUrl = (
  collectionId: string | number | '',
  customerId?: string | number,
) => {
  if (!collectionId) {
    return null;
  }

  const params = new URLSearchParams({ collectionId: String(collectionId) });
  if (customerId !== undefined && customerId !== null && customerId !== '') {
    params.set('customerId', String(customerId));
  }

  return `${COLLECTION_ITEM_LIST_ENDPOINT}?${params.toString()}`;
};

export function useGetCollectionItems(collectionId: string | number | '', customerId?: string | number) {
  const url = buildCollectionItemsUrl(collectionId, customerId);

  const { data, isLoading, error, isValidating } = useSWR<CollectionItemsData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      collectionItems: data?.collectionItems || data?.items || [],
      collectionItemsLoading: isLoading,
      collectionItemsError: error,
      collectionItemsValidating: isValidating,
      collectionItemsEmpty: !isLoading && !(data?.collectionItems || data?.items || []).length,
    }),
    [data?.collectionItems, data?.items, error, isLoading, isValidating],
  );
}

export function useGetCollectionItem(itemId: string | number | '') {
  const url = itemId ? endpoints.collectionItem.details(itemId) : null;

  const { data, isLoading, error, isValidating } = useSWR<CollectionItemData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      collectionItem: data?.collectionItem || data?.item,
      collectionItemLoading: isLoading,
      collectionItemError: error,
      collectionItemValidating: isValidating,
    }),
    [data?.collectionItem, data?.item, error, isLoading, isValidating],
  );
}

export function useGetViewedCollectionItemIds(
  ownerCustomerId?: string | number,
  collectionId?: string | number,
) {
  let url = endpoints.collectionItem.view;
  const params: string[] = [];

  if (ownerCustomerId !== undefined && ownerCustomerId !== null) {
    params.push(`ownerCustomerId=${encodeURIComponent(String(ownerCustomerId))}`);
  }

  if (collectionId !== undefined && collectionId !== null && collectionId !== '') {
    params.push(`collectionId=${encodeURIComponent(String(collectionId))}`);
  }

  if (params.length) {
    url += `?${params.join('&')}`;
  }

  const { data, isLoading, error, isValidating } = useSWR<ViewedCollectionItemsData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      viewedCollectionItemIds: data?.viewedCollectionItemIds || [],
      viewedCollectionItemIdsLoading: isLoading,
      viewedCollectionItemIdsError: error,
      viewedCollectionItemIdsValidating: isValidating,
    }),
    [data?.viewedCollectionItemIds, error, isLoading, isValidating],
  );
}

export async function createCollectionItem(item: Omit<ICollectionDrawerItem, 'id' | 'updatedAt'>) {
  const res = await axios.post(endpoints.collectionItem.add, { item });
  const created = (res.data as CollectionItemData).collectionItem || (res.data as CollectionItemData).item;

  const baseListUrl = buildCollectionItemsUrl(item.collectionId);
  if (baseListUrl) {
    if (created) {
      mutateCollectionItemsList(baseListUrl, (items) => upsertCollectionItemInList(items, created));
    }
    mutate(baseListUrl);
  }

  const customerListUrl = buildCollectionItemsUrl(item.collectionId, item.customerId ?? undefined);
  if (customerListUrl && customerListUrl !== baseListUrl) {
    if (created) {
      mutateCollectionItemsList(customerListUrl, (items) => upsertCollectionItemInList(items, created));
    }
    mutate(customerListUrl);
  }

  return res.data;
}

export async function updateCollectionItem(id: string | number, updates: Partial<ICollectionDrawerItem>) {
  const res = await axios.put(endpoints.collectionItem.update(id), { updates });

  const updated = (res.data as { collectionItem?: ICollectionDrawerItem; item?: ICollectionDrawerItem })
    .collectionItem || (res.data as { collectionItem?: ICollectionDrawerItem; item?: ICollectionDrawerItem }).item;

  if (updated) {
    mutate<CollectionItemData>(
      endpoints.collectionItem.details(id),
      {
        collectionItem: updated,
        item: updated,
      },
      { revalidate: false },
    );
  } else {
    mutate(endpoints.collectionItem.details(id));
  }

  if (updated?.collectionId) {
    const baseListUrl = buildCollectionItemsUrl(updated.collectionId);
    if (baseListUrl) {
      mutateCollectionItemsList(baseListUrl, (items) => upsertCollectionItemInList(items, updated));
      mutate(baseListUrl);
    }

    const customerListUrl = buildCollectionItemsUrl(updated.collectionId, updated.customerId ?? undefined);
    if (customerListUrl && customerListUrl !== baseListUrl) {
      mutateCollectionItemsList(customerListUrl, (items) => upsertCollectionItemInList(items, updated));
      mutate(customerListUrl);
    }
  }

  return res.data;
}

export async function deleteCollectionItem(
  id: string | number,
  collectionId: string | number,
  customerId?: string | number,
) {
  const res = await axios.delete(endpoints.collectionItem.delete(id));

  const baseListUrl = buildCollectionItemsUrl(collectionId);
  if (baseListUrl) {
    mutateCollectionItemsList(baseListUrl, (items) => removeCollectionItemFromList(items, id));
    mutate(baseListUrl);
  }

  const customerListUrl = buildCollectionItemsUrl(collectionId, customerId);
  if (customerListUrl && customerListUrl !== baseListUrl) {
    mutateCollectionItemsList(customerListUrl, (items) => removeCollectionItemFromList(items, id));
    mutate(customerListUrl);
  }

  return res.data;
}

type CollectionItemViewData = {
  totalViews: number;
  alreadyViewed: boolean;
  viewedAt: string | null;
};

/**
 * Record a collection item view.
 * The backend increments total_views only when this customer has not viewed it before.
 */
export async function recordCollectionItemView(
  itemId: string | number,
): Promise<CollectionItemViewData | undefined> {
  try {
    const res = await axios.post<CollectionItemViewData>(endpoints.collectionItem.view, {
      collectionItemId: Number(itemId),
    });

    mutate(endpoints.collectionItem.details(itemId));

    return res.data;
  } catch {
    return undefined;
  }
}
