import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import type { WebsiteTestingDisclosureContentData } from 'src/content/website-testing-disclosure';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

import { DEFAULT_WEBSITE_TESTING_DISCLOSURE } from 'src/content/website-testing-disclosure';

// ----------------------------------------------------------------------

type DisclosureResponse = {
  disclosure?: WebsiteTestingDisclosureContentData;
};

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

export function useGetWebsiteTestingDisclosure(enabled = true) {
  const url = enabled ? endpoints.siteSettings.testingDisclosure : null;

  const { data, isLoading, error, isValidating, mutate: mutateDisclosure } = useSWR<DisclosureResponse>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      disclosure: data?.disclosure || DEFAULT_WEBSITE_TESTING_DISCLOSURE,
      disclosureLoading: isLoading,
      disclosureError: error,
      disclosureValidating: isValidating,
      refreshDisclosure: () => mutateDisclosure(),
    }),
    [data?.disclosure, error, isLoading, isValidating, mutateDisclosure],
  );
}

export async function updateWebsiteTestingDisclosure(payload: {
  title: string;
  intro: string;
  sections: WebsiteTestingDisclosureContentData['sections'];
}) {
  const res = await axiosInstance.put(endpoints.siteSettings.testingDisclosure, payload);
  await mutate(endpoints.siteSettings.testingDisclosure);
  return (res.data as DisclosureResponse)?.disclosure || null;
}
