import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const PICTURE_LIST_ENDPOINT = endpoints.journeyDiary.picture.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type PicturesData = {
  pictures: IJourneyRepresentativePicture[];
};

const buildPictureListUrl = (userId?: string | number, journeyGroupKey?: string | null) => {
  if (!userId || journeyGroupKey === null) {
    return null;
  }

  const params = new URLSearchParams({ userId: String(userId) });

  if (journeyGroupKey) {
    params.set('journeyGroupKey', journeyGroupKey);
  }

  return `${PICTURE_LIST_ENDPOINT}?${params.toString()}`;
};

export function useGetJourneyRepresentativePictures(
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const url = buildPictureListUrl(userId, journeyGroupKey);

  const { data, isLoading, error, isValidating } = useSWR<PicturesData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      pictures: data?.pictures || [],
      picturesLoading: isLoading,
      picturesError: error,
      picturesValidating: isValidating,
      picturesEmpty: !isLoading && !data?.pictures.length,
    }),
    [data?.pictures, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

const revalidatePictureList = (userId?: string | number, journeyGroupKey?: string | null) => {
  const userListUrl = buildPictureListUrl(userId);

  if (userListUrl) {
    mutate(userListUrl);
  }

  const scopedListUrl = buildPictureListUrl(userId, journeyGroupKey);

  if (scopedListUrl) {
    mutate(scopedListUrl);
  }

  mutate(PICTURE_LIST_ENDPOINT);
};

export async function createJourneyRepresentativePicture(
  picture: Omit<IJourneyRepresentativePicture, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.journeyDiary.picture.add, { picture });
  revalidatePictureList(picture.userId || undefined, picture.journeyGroupKey);
  return res.data;
}

export async function deleteJourneyRepresentativePicture(
  id: string | number,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.delete(endpoints.journeyDiary.picture.delete(id));
  revalidatePictureList(userId, journeyGroupKey);
  return res.data;
}

export async function updateJourneyRepresentativePicture(
  id: string | number,
  updates: Partial<Pick<IJourneyRepresentativePicture, 'caption' | 'sortOrder' | 'isPublic' | 'visitedAt'>>,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.put(endpoints.journeyDiary.picture.update(id), { updates });
  revalidatePictureList(userId, journeyGroupKey);
  return res.data;
}
