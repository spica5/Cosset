import type { ICinemaFilm } from 'src/types/cinema-film';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type FilmsData = {
  films?: ICinemaFilm[];
};

type FilmData = {
  film?: ICinemaFilm;
};

export function buildCinemaFilmListUrl(
  customerId: string | null | undefined,
  category: CinemaCategory,
  options?: { publicOnly?: boolean },
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

  return `${endpoints.cinema.film.list}?${params.toString()}`;
}

export function useGetCinemaFilms(
  customerId?: string | number | null,
  category?: CinemaCategory | null,
  options?: { publicOnly?: boolean },
) {
  const normalizedCustomerId =
    customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
  const canFetch = Boolean(category) && (Boolean(normalizedCustomerId) || options?.publicOnly);

  const listUrl = canFetch
    ? buildCinemaFilmListUrl(normalizedCustomerId || null, category!, options)
    : null;

  const { data, isLoading, error, isValidating } = useSWR<FilmsData>(
    listUrl,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      films: data?.films || [],
      filmsLoading: isLoading,
      filmsError: error,
      filmsValidating: isValidating,
      filmsEmpty: !isLoading && !(data?.films || []).length,
    }),
    [data?.films, error, isLoading, isValidating],
  );
}

export async function revalidateCinemaFilms(
  customerId: string | null | undefined,
  category: CinemaCategory,
  options?: { publicOnly?: boolean },
) {
  await mutate(buildCinemaFilmListUrl(customerId, category, options));
}

async function refreshCinemaFilmLists(customerId: string, category: CinemaCategory) {
  await revalidateCinemaFilms(customerId, category);
  await revalidateCinemaFilms(customerId, category, { publicOnly: true });
  // Community catalog (all public films in category)
  await revalidateCinemaFilms(null, category, { publicOnly: true });
}

export async function createCinemaFilm(
  film: Omit<ICinemaFilm, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.cinema.film.add, { film });
  const createdFilm = res.data?.film as ICinemaFilm | undefined;

  if (createdFilm?.customerId && createdFilm.category) {
    await refreshCinemaFilmLists(createdFilm.customerId, createdFilm.category);
  }

  return res.data;
}

export async function updateCinemaFilm(
  id: string | number,
  updates: Partial<ICinemaFilm>,
  context?: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.put(endpoints.cinema.film.update(id), { updates });
  const updatedFilm = res.data?.film as ICinemaFilm | undefined;

  const customerId = updatedFilm?.customerId || context?.customerId;
  const category = updatedFilm?.category || context?.category;

  if (customerId && category) {
    await refreshCinemaFilmLists(customerId, category);
  }

  mutate<FilmData>(endpoints.cinema.film.details(id));
  return res.data;
}

export async function deleteCinemaFilm(
  id: string | number,
  context: { customerId: string; category: CinemaCategory },
) {
  const res = await axios.delete(endpoints.cinema.film.delete(id));

  await refreshCinemaFilmLists(context.customerId, context.category);

  return res.data;
}
