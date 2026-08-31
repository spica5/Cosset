import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type IntroVideoData = {
  title: string | null;
  videoKey: string | null;
  videoUrl: string | null;
  playbackUrl: string | null;
  updatedAt: string | null;
  hasVideo: boolean;
};

type IntroVideoResponse = {
  introVideo: IntroVideoData;
};

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

export function useGetIntroVideo(enabled: boolean = true) {
  const url = enabled ? endpoints.siteSettings.introVideo : null;

  const { data, isLoading, error, isValidating } = useSWR<IntroVideoResponse>(
    url,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      introVideo: data?.introVideo || null,
      introVideoLoading: isLoading,
      introVideoError: error,
      introVideoValidating: isValidating,
    }),
    [data?.introVideo, error, isLoading, isValidating],
  );
}

export async function saveIntroVideo(payload: {
  title?: string | null;
  videoKey?: string | null;
  videoUrl?: string | null;
  clear?: boolean;
}) {
  const res = await axiosInstance.put(endpoints.siteSettings.introVideo, payload);
  await mutate(endpoints.siteSettings.introVideo);
  return res.data as IntroVideoResponse;
}
