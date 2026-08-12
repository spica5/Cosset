import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';
import type { ICinemaFilmScreening, ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

import { revalidateCinemaFilms } from 'src/actions/cinema-film';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

type ScreeningsData = {
  screenings?: ICinemaFilmScreeningWithFilm[];
};

type ScreeningData = {
  screening?: ICinemaFilmScreening;
};

export function buildCinemaScreeningListUrl(
  customerId: string | null | undefined,
  category: CinemaCategory,
  options?: { publicOnly?: boolean; allCatalog?: boolean },
) {
  const params = new URLSearchParams({
    category,
  });

  const normalizedCustomerId = String(customerId || '').trim();
  if (normalizedCustomerId) {
    params.set('customerId', normalizedCustomerId);
  }

  if (options?.publicOnly) {
    params.set('publicOnly', '1');
  }

  if (options?.allCatalog) {
    params.set('allCatalog', '1');
  }

  return `${endpoints.cinema.screening.list}?${params.toString()}`;
}

export function useGetCinemaScreenings(
  customerId?: string | number | null,
  category?: CinemaCategory | null,
  options?: { publicOnly?: boolean; allCatalog?: boolean },
) {
  const normalizedCustomerId =
    customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
  const canFetch =
    Boolean(category) && (Boolean(normalizedCustomerId) || options?.publicOnly || options?.allCatalog);

  const listUrl = canFetch
    ? buildCinemaScreeningListUrl(normalizedCustomerId || null, category!, options)
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
  customerId: string | null | undefined,
  category: CinemaCategory,
  options?: { publicOnly?: boolean; allCatalog?: boolean },
) {
  await mutate(buildCinemaScreeningListUrl(customerId, category, options));
}

/** Revalidate every mounted/cached screening list for a category (all query variants). */
export async function revalidateCinemaScreeningsForCategory(category: CinemaCategory) {
  const listBase = endpoints.cinema.screening.list;
  await mutate(
    (key) =>
      typeof key === 'string' &&
      (key === listBase || key.startsWith(`${listBase}?`)) &&
      key.includes(`category=${category}`),
    undefined,
    { revalidate: true },
  );
}

async function refreshCinemaCategoryData(
  customerId: string,
  category: CinemaCategory,
) {
  await Promise.all([
    revalidateCinemaScreeningsForCategory(category),
    revalidateCinemaScreenings(customerId, category),
    revalidateCinemaScreenings(customerId, category, { publicOnly: true }),
    revalidateCinemaScreenings(customerId, category, { allCatalog: true }),
    revalidateCinemaScreenings(null, category, { publicOnly: true }),
    revalidateCinemaScreenings(null, category, { allCatalog: true }),
    revalidateCinemaFilms(customerId, category),
    revalidateCinemaFilms(customerId, category, { publicOnly: true }),
    revalidateCinemaFilms(customerId, category, { allCatalog: true }),
    revalidateCinemaFilms(null, category, { publicOnly: true }),
    revalidateCinemaFilms(null, category, { allCatalog: true }),
  ]);
}

export async function createCinemaScreening(
  screening: Omit<ICinemaFilmScreening, 'id' | 'createdAt' | 'updatedAt'>,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.post(endpoints.cinema.screening.add, { screening });

  await refreshCinemaCategoryData(context.customerId, context.category);

  return res.data;
}

export async function updateCinemaScreening(
  id: string | number,
  updates: Partial<ICinemaFilmScreening>,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.put(endpoints.cinema.screening.update(id), { updates });

  await refreshCinemaCategoryData(context.customerId, context.category);

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
