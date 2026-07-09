import type { IJourneyMemorialThing, JourneyMemorialThingCategory } from 'src/types/journey-diary-memorial-thing';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { endpoints, fetcher } from 'src/utils/axios';

const MEMORIAL_THING_LIST_ENDPOINT = endpoints.journeyDiary.memorialThing.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type MemorialThingsData = {
  memorialThings: IJourneyMemorialThing[];
};

const buildMemorialThingListUrl = (
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) => {
  if (!userId || journeyGroupKey === null) {
    return null;
  }

  const params = new URLSearchParams({ userId: String(userId) });

  if (journeyGroupKey) {
    params.set('journeyGroupKey', journeyGroupKey);
  }

  if (category) {
    params.set('category', category);
  }

  return `${MEMORIAL_THING_LIST_ENDPOINT}?${params.toString()}`;
};

export function useGetJourneyMemorialThings(
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) {
  const url = buildMemorialThingListUrl(userId, journeyGroupKey, category);

  const { data, isLoading, error, isValidating } = useSWR<MemorialThingsData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      memorialThings: data?.memorialThings || [],
      memorialThingsLoading: isLoading,
      memorialThingsError: error,
      memorialThingsValidating: isValidating,
      memorialThingsEmpty: !isLoading && !data?.memorialThings.length,
    }),
    [data?.memorialThings, error, isLoading, isValidating],
  );
}

const revalidateMemorialThingList = (
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) => {
  const userListUrl = buildMemorialThingListUrl(userId);

  if (userListUrl) {
    mutate(userListUrl);
  }

  const scopedListUrl = buildMemorialThingListUrl(userId, journeyGroupKey, category);

  if (scopedListUrl) {
    mutate(scopedListUrl);
  }

  const journeyListUrl = buildMemorialThingListUrl(userId, journeyGroupKey);

  if (journeyListUrl && journeyListUrl !== scopedListUrl) {
    mutate(journeyListUrl);
  }

  mutate(MEMORIAL_THING_LIST_ENDPOINT);
};

export async function createJourneyMemorialThing(
  memorialThing: Omit<IJourneyMemorialThing, 'id' | 'createdAt' | 'updatedAt'> & {
    imageKeys?: string[];
  },
) {
  const res = await axios.post(endpoints.journeyDiary.memorialThing.add, { memorialThing });
  revalidateMemorialThingList(
    memorialThing.userId || undefined,
    memorialThing.journeyGroupKey,
    memorialThing.category,
  );
  revalidateMemorialThingList(memorialThing.userId || undefined, memorialThing.journeyGroupKey);
  return res.data;
}

export async function updateJourneyMemorialThing(
  id: string | number,
  updates: Partial<
    Pick<
      IJourneyMemorialThing,
      | 'category'
      | 'title'
      | 'description'
      | 'pictureId'
      | 'imageKey'
      | 'memorialDate'
      | 'sortOrder'
      | 'isPublic'
    >
  > & {
    imageKeys?: string[];
  },
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) {
  const res = await axios.put(endpoints.journeyDiary.memorialThing.update(id), { updates });
  mutate(endpoints.journeyDiary.memorialThing.details(id));
  revalidateMemorialThingList(userId, journeyGroupKey, category);
  revalidateMemorialThingList(userId, journeyGroupKey);
  if (updates.category && updates.category !== category) {
    revalidateMemorialThingList(userId, journeyGroupKey, updates.category);
  }
  return res.data;
}

export async function deleteJourneyMemorialThing(
  id: string | number,
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) {
  const res = await axios.delete(endpoints.journeyDiary.memorialThing.delete(id));
  revalidateMemorialThingList(userId, journeyGroupKey, category);
  revalidateMemorialThingList(userId, journeyGroupKey);
  return res.data;
}
