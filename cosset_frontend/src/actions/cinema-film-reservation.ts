import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type ReservationsData = {
  reservations?: ICinemaFilmReservationWithScreening[];
};

export function buildCinemaReservationListUrl(
  customerId: string,
  options?: {
    ownerCustomerId?: string;
    category?: CinemaCategory;
    status?: 'reserved' | 'cancelled' | 'all';
  },
) {
  const params = new URLSearchParams({ customerId });

  if (options?.ownerCustomerId) {
    params.set('ownerCustomerId', options.ownerCustomerId);
  }

  if (options?.category) {
    params.set('category', options.category);
  }

  if (options?.status) {
    params.set('status', options.status);
  }

  return `${endpoints.cinema.reservation.list}?${params.toString()}`;
}

export function useGetCinemaReservations(
  customerId?: string | number | null,
  options?: {
    ownerCustomerId?: string;
    category?: CinemaCategory | null;
    status?: 'reserved' | 'cancelled' | 'all';
  },
) {
  const listUrl =
    customerId
      ? buildCinemaReservationListUrl(String(customerId), {
          ownerCustomerId: options?.ownerCustomerId,
          category: options?.category || undefined,
          status: options?.status,
        })
      : null;

  const { data, isLoading, error, isValidating } = useSWR<ReservationsData>(
    listUrl,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      reservations: data?.reservations || [],
      reservationsLoading: isLoading,
      reservationsError: error,
      reservationsValidating: isValidating,
      reservationsEmpty: !isLoading && !(data?.reservations || []).length,
    }),
    [data?.reservations, error, isLoading, isValidating],
  );
}

export async function revalidateCinemaReservations(
  customerId: string,
  options?: {
    ownerCustomerId?: string;
    category?: CinemaCategory;
    status?: 'reserved' | 'cancelled' | 'all';
  },
) {
  await mutate(buildCinemaReservationListUrl(customerId, options));
}

export async function createCinemaReservation(
  payload: { screeningId: number; customerId: string; seatIds: string[] },
  context?: {
    ownerCustomerId?: string;
    category?: CinemaCategory;
  },
) {
  const res = await axios.post(endpoints.cinema.reservation.add, payload);
  const reservation = res.data?.reservation as ICinemaFilmReservationWithScreening | undefined;

  if (payload.customerId) {
    await revalidateCinemaReservations(payload.customerId, {
      ownerCustomerId: context?.ownerCustomerId || reservation?.ownerCustomerId,
      category: context?.category,
      status: 'reserved',
    });
    await revalidateCinemaReservations(payload.customerId, {
      category: context?.category,
      status: 'reserved',
    });
    await revalidateCinemaReservations(payload.customerId, { status: 'reserved' });
  }

  return res.data;
}

export async function updateCinemaReservationSeats(
  id: string | number,
  payload: { customerId: string; seatIds: string[] },
  context?: {
    ownerCustomerId?: string;
    category?: CinemaCategory;
  },
) {
  const res = await axios.patch(endpoints.cinema.reservation.details(id), payload);
  const reservation = res.data?.reservation as ICinemaFilmReservationWithScreening | undefined;

  if (payload.customerId) {
    await revalidateCinemaReservations(payload.customerId, {
      ownerCustomerId: context?.ownerCustomerId || reservation?.ownerCustomerId,
      category: context?.category,
      status: 'reserved',
    });
    await revalidateCinemaReservations(payload.customerId, {
      category: context?.category,
      status: 'reserved',
    });
    await revalidateCinemaReservations(payload.customerId, { status: 'reserved' });
  }

  return res.data;
}

export async function cancelCinemaReservation(
  id: string | number,
  customerId: string,
  context?: {
    ownerCustomerId?: string;
    category?: CinemaCategory;
  },
) {
  const res = await axios.delete(endpoints.cinema.reservation.delete(id), {
    data: { customerId },
  });

  await revalidateCinemaReservations(customerId, {
    ownerCustomerId: context?.ownerCustomerId,
    category: context?.category,
    status: 'reserved',
  });
  await revalidateCinemaReservations(customerId, {
    category: context?.category,
    status: 'reserved',
  });
  await revalidateCinemaReservations(customerId, { status: 'reserved' });

  return res.data;
}
