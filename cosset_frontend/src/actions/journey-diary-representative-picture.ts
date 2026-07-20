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

const revalidatePictureList = async (
  userId?: string | number,
  journeyGroupKey?: string | null,
  updater?: (pictures: IJourneyRepresentativePicture[]) => IJourneyRepresentativePicture[],
) => {
  const applyUpdater = (currentData?: PicturesData) => {
    if (!updater || !currentData?.pictures) {
      return currentData;
    }

    return {
      ...currentData,
      pictures: updater(currentData.pictures),
    };
  };

  const userListUrl = buildPictureListUrl(userId);

  if (userListUrl) {
    await mutate(userListUrl, applyUpdater, { revalidate: true });
  }

  const scopedListUrl = buildPictureListUrl(userId, journeyGroupKey);

  if (scopedListUrl && scopedListUrl !== userListUrl) {
    await mutate(scopedListUrl, applyUpdater, { revalidate: true });
  }
};

export async function createJourneyRepresentativePicture(
  picture: Omit<IJourneyRepresentativePicture, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.journeyDiary.picture.add, { picture });
  await revalidatePictureList(picture.userId || undefined, picture.journeyGroupKey);
  return res.data;
}

export async function deleteJourneyRepresentativePicture(
  id: string | number,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.delete(endpoints.journeyDiary.picture.delete(id));
  await revalidatePictureList(userId, journeyGroupKey, (pictures) =>
    pictures.filter((picture) => String(picture.id) !== String(id)),
  );
  return res.data;
}

export async function updateJourneyRepresentativePicture(
  id: string | number,
  updates: Partial<Pick<IJourneyRepresentativePicture, 'caption' | 'sortOrder' | 'isPublic' | 'visitedAt'>>,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.put(endpoints.journeyDiary.picture.update(id), { updates });
  const updatedPicture = res.data?.picture as IJourneyRepresentativePicture | undefined;

  await revalidatePictureList(userId, journeyGroupKey, (pictures) =>
    pictures.map((picture) => {
      if (String(picture.id) !== String(id)) {
        return picture;
      }

      return {
        ...picture,
        ...updates,
        ...(updatedPicture || {}),
      };
    }),
  );

  return res.data;
}
