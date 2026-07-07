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

export function useGetJourneyRepresentativePictures(
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const params = new URLSearchParams();

  if (userId) {
    params.set('userId', String(userId));
  }

  if (journeyGroupKey) {
    params.set('journeyGroupKey', journeyGroupKey);
  }

  const url =
    userId && journeyGroupKey ? `${PICTURE_LIST_ENDPOINT}?${params.toString()}` : null;

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
  if (!userId || !journeyGroupKey) {
    mutate(PICTURE_LIST_ENDPOINT);
    return;
  }

  const params = new URLSearchParams({
    userId: String(userId),
    journeyGroupKey,
  });

  mutate(`${PICTURE_LIST_ENDPOINT}?${params.toString()}`);
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
  updates: Partial<Pick<IJourneyRepresentativePicture, 'caption' | 'sortOrder'>>,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.put(endpoints.journeyDiary.picture.update(id), { updates });
  revalidatePictureList(userId, journeyGroupKey);
  return res.data;
}
