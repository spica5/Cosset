import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const LOCATION_LIST_ENDPOINT = endpoints.journeyDiary.location.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type LocationsData = {
  locations: IJourneyDiaryLocation[];
};

export function useGetJourneyDiaryLocations(userId?: string | number) {
  const url = userId ? `${LOCATION_LIST_ENDPOINT}?userId=${userId}` : LOCATION_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<LocationsData>(
    url,
    fetcher,
    swrOptions,
  );

  const memoizedValue = useMemo(
    () => ({
      locations: data?.locations || [],
      locationsLoading: isLoading,
      locationsError: error,
      locationsValidating: isValidating,
      locationsEmpty: !isLoading && !data?.locations.length,
    }),
    [data?.locations, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type LocationData = {
  location: IJourneyDiaryLocation;
};

export function useGetJourneyDiaryLocation(locationId: string | number | '') {
  const url = locationId ? endpoints.journeyDiary.location.details(locationId) : null;

  const { data, isLoading, error, isValidating } = useSWR<LocationData>(
    url,
    fetcher,
    swrOptions,
  );

  const memoizedValue = useMemo(
    () => ({
      location: data?.location,
      locationLoading: isLoading,
      locationError: error,
      locationValidating: isValidating,
    }),
    [data?.location, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

const revalidateLocationList = (userId?: string | number) => {
  mutate(LOCATION_LIST_ENDPOINT);
  if (userId) {
    mutate(`${LOCATION_LIST_ENDPOINT}?userId=${userId}`);
  }
};

export async function createJourneyDiaryLocation(
  location: Omit<IJourneyDiaryLocation, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.journeyDiary.location.add, { location });
  revalidateLocationList(location.userId || undefined);
  return res.data;
}

export async function updateJourneyDiaryLocation(
  id: string | number,
  updates: Partial<IJourneyDiaryLocation>,
  userId?: string | number,
) {
  const res = await axios.put(endpoints.journeyDiary.location.update(id), { updates });
  mutate(endpoints.journeyDiary.location.details(id));
  revalidateLocationList(userId);
  return res.data;
}

export async function deleteJourneyDiaryLocation(id: string | number, userId?: string | number) {
  const res = await axios.delete(endpoints.journeyDiary.location.delete(id));
  revalidateLocationList(userId);
  return res.data;
}
