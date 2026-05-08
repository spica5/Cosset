import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type IDesignSpaceItem = {
  id: number;
  customerId: string | null;
  background: string | null;
  rooms: string | null;
  effects: string | null;
};

type DesignSpaceApiResponse = {
  designSpaces: IDesignSpaceItem[];
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetDesignSpaces(customerId?: string) {
  const url = customerId
    ? `${endpoints.designSpace.root}?customerId=${customerId}`
    : endpoints.designSpace.root;

  const { data, isLoading, error, isValidating } = useSWR<DesignSpaceApiResponse>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      designSpaces: data?.designSpaces || [],
      designSpacesLoading: isLoading,
      designSpacesError: error,
      designSpacesValidating: isValidating,
      designSpacesEmpty: !isLoading && !data?.designSpaces?.length,
    }),
    [data?.designSpaces, error, isLoading, isValidating]
  );

  return memoizedValue;
}
