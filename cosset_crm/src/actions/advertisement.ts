import type { AdvertisementInput, IAdvertisement } from 'src/types/advertisement';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

type AdvertisementsData = {
  advertisements?: IAdvertisement[];
};

type AdvertisementData = {
  advertisement?: IAdvertisement;
};

export function useGetAdvertisements(enabled: boolean = true) {
  const url = enabled ? endpoints.admin.advertisements.list : null;

  const { data, isLoading, error, isValidating, mutate: mutateList } = useSWR<AdvertisementsData>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      advertisements: data?.advertisements || [],
      advertisementsLoading: isLoading,
      advertisementsError: error,
      advertisementsValidating: isValidating,
      advertisementsEmpty: !isLoading && !(data?.advertisements || []).length,
      refreshAdvertisements: () => mutateList(undefined, { revalidate: true }),
    }),
    [data?.advertisements, error, isLoading, isValidating, mutateList],
  );
}

export async function revalidateAdvertisements() {
  await mutate(endpoints.admin.advertisements.list);
}

export async function createAdvertisement(advertisement: AdvertisementInput) {
  const res = await axios.post<AdvertisementData>(endpoints.admin.advertisements.add, {
    advertisement,
  });
  await revalidateAdvertisements();
  return res.data?.advertisement || null;
}

export async function updateAdvertisement(
  id: string | number,
  updates: Partial<AdvertisementInput>,
) {
  const res = await axios.put<AdvertisementData>(endpoints.admin.advertisements.details(id), {
    updates,
  });
  await revalidateAdvertisements();
  return res.data?.advertisement || null;
}

export async function deleteAdvertisement(id: string | number) {
  await axios.delete(endpoints.admin.advertisements.details(id));
  await revalidateAdvertisements();
}
