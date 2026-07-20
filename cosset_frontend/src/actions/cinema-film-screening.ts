import type { ICinemaFilmScreening, ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

import { revalidateCinemaFilms } from 'src/actions/cinema-film';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type ScreeningsData = {
  screenings?: ICinemaFilmScreeningWithFilm[];
};

type ScreeningData = {
  screening?: ICinemaFilmScreening;
};

export function buildCinemaScreeningListUrl(
  customerId: string,
  category: CinemaCategory,
  options?: { publicOnly?: boolean },
) {
  const params = new URLSearchParams({
    customerId,
    category,
  });

  if (options?.publicOnly) {
    params.set('publicOnly', '1');
  }

  return `${endpoints.cinema.screening.list}?${params.toString()}`;
}

export function useGetCinemaScreenings(
  customerId?: string | number | null,
  category?: CinemaCategory | null,
  options?: { publicOnly?: boolean },
) {
  const listUrl =
    customerId && category
      ? buildCinemaScreeningListUrl(String(customerId), category, options)
      : null;

  const { data, isLoading, error, isValidating } = useSWR<ScreeningsData>(
    listUrl,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      screenings: data?.screenings || [],
      screeningsLoading: isLoading,
      screeningsError: error,
      screeningsValidating: isValidating,
      screeningsEmpty: !isLoading && !(data?.screenings || []).length,
    }),
    [data?.screenings, error, isLoading, isValidating],
  );
}

export async function revalidateCinemaScreenings(
  customerId: string,
  category: CinemaCategory,
  options?: { publicOnly?: boolean },
) {
  await mutate(buildCinemaScreeningListUrl(customerId, category, options));
}

async function refreshCinemaCategoryData(
  customerId: string,
  category: CinemaCategory,
) {
  await revalidateCinemaScreenings(customerId, category);
  await revalidateCinemaScreenings(customerId, category, { publicOnly: true });
  await revalidateCinemaFilms(customerId, category);
  await revalidateCinemaFilms(customerId, category, { publicOnly: true });
}

export async function createCinemaScreening(
  screening: Omit<ICinemaFilmScreening, 'id' | 'createdAt' | 'updatedAt'>,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.post(endpoints.cinema.screening.add, { screening });
  const createdScreening = res.data?.screening as ICinemaFilmScreening | undefined;

  if (createdScreening?.customerId) {
    await refreshCinemaCategoryData(context.customerId, context.category);
  }

  return res.data;
}

export async function updateCinemaScreening(
  id: string | number,
  updates: Partial<ICinemaFilmScreening>,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.put(endpoints.cinema.screening.update(id), { updates });
  const updatedScreening = res.data?.screening as ICinemaFilmScreening | undefined;

  if (updatedScreening?.customerId || context.customerId) {
    await refreshCinemaCategoryData(context.customerId, context.category);
  }

  mutate<ScreeningData>(endpoints.cinema.screening.details(id));
  return res.data;
}

export async function deleteCinemaScreening(
  id: string | number,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.delete(endpoints.cinema.screening.delete(id));

  await refreshCinemaCategoryData(context.customerId, context.category);

  return res.data;
}
