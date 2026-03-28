import type { IGuestAreaItem } from 'src/types/guestarea';

import useSWR from 'swr';
import { useMemo } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type GuestAreaApiResponse = {
  guestAreas: IGuestAreaItem[];
};

export function useGetGuestAreas() {
  const url = endpoints.guestArea.root;

  const { data, isLoading, error, isValidating } = useSWR<GuestAreaApiResponse>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      guestAreas: data?.guestAreas || [],
      guestAreasLoading: isLoading,
      guestAreasError: error,
      guestAreasValidating: isValidating,
      guestAreasEmpty: !isLoading && !data?.guestAreas?.length,
    }),
    [data?.guestAreas, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export function useGetGuestArea(customerId: string | number | '') {
  // Construct URL with customerId as query parameter
  const url = customerId ? `${endpoints.guestArea.root}?customerId=${customerId}` : null;

  const { data, isLoading, error, isValidating } = useSWR<GuestAreaApiResponse>(
    url,
    fetcher,
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const memoizedValue = useMemo(
    () => ({
      guestarea: data?.guestAreas?.[0],
      guestAreaLoading: isLoading,
      guestAreaError: error,
      guestAreaValidating: isValidating,
    }),
    [data?.guestAreas, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function updateGuestArea(updates: Partial<IGuestAreaItem> & { id: string }) {
  const url = endpoints.guestArea.root;
  const data = { guestArea: updates };

  const res = await axios.post(url, data);

  // mutate(`${endpoints.guestArea.root}?customerId=${updates.id}`);
  
  return res.data;
}
