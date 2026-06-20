import type { IMailBackgroundImage } from 'src/types/mail-background';

import useSWR from 'swr';
import { useMemo } from 'react';

import { endpoints, fetcher } from 'src/utils/axios';

export {
  createMailBackground,
  deleteMailBackground,
  resolveMailBackgroundUrls,
} from './mail-background-api';

// ----------------------------------------------------------------------

type BackgroundsResponse = {
  backgrounds: IMailBackgroundImage[];
};

export function useGetMailBackgrounds(enabled = true) {
  const url = enabled ? endpoints.mail.backgrounds.list : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR<BackgroundsResponse>(
    url,
    fetcher,
  );

  const backgrounds = useMemo(() => data?.backgrounds ?? [], [data?.backgrounds]);

  return {
    backgrounds,
    backgroundsLoading: isLoading,
    backgroundsError: error,
    backgroundsValidating: isValidating,
    mutateBackgrounds: mutate,
  };
}
