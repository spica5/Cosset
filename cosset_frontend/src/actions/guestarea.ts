import type { IGuestAreaItem } from 'src/types/guestarea';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

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

export function useGetGuestArea(customerId: string | number | '') {
  // Construct URL with customerId as query parameter
  const url = customerId ? `${endpoints.guestArea.root}?customerId=${customerId}` : null;

  const { data, isLoading, error, isValidating } = useSWR<GuestAreaApiResponse>(
    url,
    fetcher,
    swrOptions
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

export async function updateGuestArea(guestArea: IGuestAreaItem) {
  const url =endpoints.guestArea.root;
  const data = { guestArea };

  const res = await axios.post(url, data);

  // mutate(`${endpoints.guestArea.root}?customerId=${guestArea.id}`);
  
  return res.data;
}
