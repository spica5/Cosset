import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

export type ReactionTargetType = 'blog' | 'album' | 'collection' | 'drawer';
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type PostReaction = {
  id: number;
  targetId: number;
  customerId: number;
  targetType: ReactionTargetType;
  reactionType: ReactionType;
  viewedAt?: Date | string;
  createdAt?: Date | string;
};

export type ReactionSummary = {
  targetType: ReactionTargetType;
  targetId: number;
  totalCount: number;
  counts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
};

type ReactionSummaryData = {
  summary?: ReactionSummary;
};

type ReactionMutationData = {
  reaction?: PostReaction;
  removed?: boolean;
  summary?: ReactionSummary;
};

const REACTION_ENDPOINT = endpoints.reaction.root;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const normalizeTargetType = (targetType: ReactionTargetType | 'collection-item'): ReactionTargetType =>
  targetType === 'collection-item' ? 'drawer' : targetType;

const buildReactionSummaryUrl = (
  targetType: ReactionTargetType | 'collection-item',
  targetId: string | number | '',
  customerId?: string | number,
) => {
  if (targetId === '' || targetId === undefined || targetId === null) {
    return null;
  }

  const params = new URLSearchParams({
    targetType: normalizeTargetType(targetType),
    targetId: String(targetId),
  });

  if (customerId !== undefined && customerId !== null && customerId !== '') {
    params.set('customerId', String(customerId));
  }

  return `${REACTION_ENDPOINT}?${params.toString()}`;
};

const revalidateReactionSummary = (
  targetType: ReactionTargetType | 'collection-item',
  targetId: string | number,
  customerId?: string | number,
) => {
  const customerUrl = buildReactionSummaryUrl(targetType, targetId, customerId);
  const publicUrl = buildReactionSummaryUrl(targetType, targetId);

  if (customerUrl) {
    mutate(customerUrl);
  }

  if (publicUrl && publicUrl !== customerUrl) {
    mutate(publicUrl);
  }
};

export function useGetReactionSummary(
  targetType: ReactionTargetType | 'collection-item',
  targetId: string | number | '',
  customerId?: string | number,
) {
  const url = buildReactionSummaryUrl(targetType, targetId, customerId);

  const { data, isLoading, error, isValidating } = useSWR<ReactionSummaryData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      reactionSummary: data?.summary,
      reactionSummaryLoading: isLoading,
      reactionSummaryError: error,
      reactionSummaryValidating: isValidating,
    }),
    [data?.summary, error, isLoading, isValidating],
  );
}

export async function setReaction(params: {
  targetType: ReactionTargetType | 'collection-item';
  targetId: string | number;
  reactionType: ReactionType;
  customerId?: string | number;
}) {
  const res = await axios.post<ReactionMutationData>(REACTION_ENDPOINT, {
    targetType: normalizeTargetType(params.targetType),
    targetId: params.targetId,
    customerId: params.customerId,
    reactionType: params.reactionType,
  });

  revalidateReactionSummary(params.targetType, params.targetId, params.customerId);

  return res.data;
}

export async function removeReaction(params: {
  targetType: ReactionTargetType | 'collection-item';
  targetId: string | number;
  customerId?: string | number;
}) {
  const res = await axios.delete<ReactionMutationData>(REACTION_ENDPOINT, {
    data: {
      targetType: normalizeTargetType(params.targetType),
      targetId: params.targetId,
      customerId: params.customerId,
    },
  });

  revalidateReactionSummary(params.targetType, params.targetId, params.customerId);

  return res.data;
}

export async function reactToBlog(
  blogId: string | number,
  reactionType: ReactionType,
  customerId?: string | number,
) {
  return setReaction({ targetType: 'blog', targetId: blogId, reactionType, customerId });
}

export async function unreactToBlog(blogId: string | number, customerId?: string | number) {
  return removeReaction({ targetType: 'blog', targetId: blogId, customerId });
}

export async function reactToBlogForLoggedInCustomer(
  blogId: string | number,
  reactionType: ReactionType,
) {
  return setReaction({ targetType: 'blog', targetId: blogId, reactionType });
}

export async function unreactToBlogForLoggedInCustomer(blogId: string | number) {
  return removeReaction({ targetType: 'blog', targetId: blogId });
}

export async function reactToAlbum(
  albumId: string | number,
  reactionType: ReactionType,
  customerId?: string | number,
) {
  return setReaction({ targetType: 'album', targetId: albumId, reactionType, customerId });
}

export async function unreactToAlbum(albumId: string | number, customerId?: string | number) {
  return removeReaction({ targetType: 'album', targetId: albumId, customerId });
}

export async function reactToAlbumForLoggedInCustomer(
  albumId: string | number,
  reactionType: ReactionType,
) {
  return setReaction({ targetType: 'album', targetId: albumId, reactionType });
}

export async function unreactToAlbumForLoggedInCustomer(albumId: string | number) {
  return removeReaction({ targetType: 'album', targetId: albumId });
}

export async function reactToCollection(
  collectionId: string | number,
  reactionType: ReactionType,
  customerId?: string | number,
) {
  return setReaction({
    targetType: 'collection',
    targetId: collectionId,
    reactionType,
    customerId,
  });
}

export async function unreactToCollection(
  collectionId: string | number,
  customerId?: string | number,
) {
  return removeReaction({ targetType: 'collection', targetId: collectionId, customerId });
}

export async function reactToDrawer(
  drawerId: string | number,
  reactionType: ReactionType,
  customerId?: string | number,
) {
  return setReaction({ targetType: 'drawer', targetId: drawerId, reactionType, customerId });
}

export async function unreactToDrawer(drawerId: string | number, customerId?: string | number) {
  return removeReaction({ targetType: 'drawer', targetId: drawerId, customerId });
}

export async function reactToCollectionItem(
  collectionItemId: string | number,
  reactionType: ReactionType,
  customerId?: string | number,
) {
  return setReaction({
    targetType: 'collection-item',
    targetId: collectionItemId,
    reactionType,
    customerId,
  });
}

export async function unreactToCollectionItem(
  collectionItemId: string | number,
  customerId?: string | number,
) {
  return removeReaction({
    targetType: 'collection-item',
    targetId: collectionItemId,
    customerId,
  });
}
