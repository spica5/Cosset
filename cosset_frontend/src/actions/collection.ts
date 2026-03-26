import type { ICollectionItem } from 'src/types/collection';
import type { IPostCommentItem } from 'src/types/post';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';
import { addPostComment, useGetPostComments } from 'src/actions/post';

const COLLECTION_LIST_ENDPOINT = endpoints.collection.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type CollectionsData = {
  collections?: ICollectionItem[];
};

type CollectionData = {
  collection?: ICollectionItem;
};

export function useGetCollections(customerId?: string | number) {
  const url = customerId
    ? `${COLLECTION_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`
    : COLLECTION_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<CollectionsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      collections: data?.collections || [],
      collectionsLoading: isLoading,
      collectionsError: error,
      collectionsValidating: isValidating,
      collectionsEmpty: !isLoading && !(data?.collections || []).length,
    }),
    [data?.collections, error, isLoading, isValidating],
  );
}

export function useGetCollection(collectionId: string | number | '') {
  const url = collectionId ? endpoints.collection.details(collectionId) : null;

  const { data, isLoading, error, isValidating } = useSWR<CollectionData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      collection: data?.collection,
      collectionLoading: isLoading,
      collectionError: error,
      collectionValidating: isValidating,
    }),
    [data?.collection, error, isLoading, isValidating],
  );
}

export async function createCollection(
  collection: Omit<ICollectionItem, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.collection.add, { collection });

  mutate(COLLECTION_LIST_ENDPOINT);
  if (collection.customerId) {
    mutate(`${COLLECTION_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(collection.customerId))}`);
  }

  return res.data;
}

export async function updateCollection(id: string | number, updates: Partial<ICollectionItem>) {
  const res = await axios.put(endpoints.collection.update(id), { updates });

  mutate(endpoints.collection.details(id));
  mutate(COLLECTION_LIST_ENDPOINT);

  const updatedCollection = (res.data as { collection?: ICollectionItem }).collection;
  if (updatedCollection?.customerId) {
    mutate(
      `${COLLECTION_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(updatedCollection.customerId))}`,
    );
  }

  return res.data;
}

export async function deleteCollection(id: string | number, customerId?: string | number) {
  const res = await axios.delete(endpoints.collection.delete(id));

  mutate(COLLECTION_LIST_ENDPOINT);
  if (customerId) {
    mutate(`${COLLECTION_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export function useGetCollectionComments(collectionId: string | number | '') {
  const {
    comments,
    commentsLoading,
    commentsError,
    commentsValidating,
    commentsEmpty,
    refreshComments,
  } = useGetPostComments(collectionId, 'collection');

  return {
    comments: comments as IPostCommentItem[],
    commentsLoading,
    commentsError,
    commentsValidating,
    commentsEmpty,
    refreshComments,
  };
}

export async function addCollectionComment(params: {
  collectionId: string | number;
  comment: string;
  customerId?: string | number | null;
  prevCustomer?: string | null;
}) {
  return addPostComment({
    targetId: params.collectionId,
    targetType: 'collection',
    comment: params.comment,
    customerId: params.customerId,
    prevCustomer: params.prevCustomer,
  });
}
