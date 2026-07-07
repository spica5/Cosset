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

export function useGetJourneyMemorialThings(
  userId?: string | number,
  journeyGroupKey?: string | null,
  category?: JourneyMemorialThingCategory | null,
) {
  const params = new URLSearchParams();

  if (userId) {
    params.set('userId', String(userId));
  }

  if (journeyGroupKey) {
    params.set('journeyGroupKey', journeyGroupKey);
  }

  if (category) {
    params.set('category', category);
  }

  const url =
    userId && journeyGroupKey ? `${MEMORIAL_THING_LIST_ENDPOINT}?${params.toString()}` : null;

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
  if (!userId || !journeyGroupKey) {
    mutate(MEMORIAL_THING_LIST_ENDPOINT);
    return;
  }

  const params = new URLSearchParams({
    userId: String(userId),
    journeyGroupKey,
  });

  if (category) {
    params.set('category', category);
  }

  mutate(`${MEMORIAL_THING_LIST_ENDPOINT}?${params.toString()}`);
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
