import { useState, useEffect } from 'react';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

const urlCache = new Map<string, string>();

export function primeMailPaperBackgroundUrl(key: string, url: string) {
  if (key && url) {
    urlCache.set(key, url);
  }
}

export function useMailPaperBackgroundUrl(key?: string | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!key) {
      return null;
    }
    return urlCache.get(key) ?? null;
  });

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return undefined;
    }

    const cached = urlCache.get(key);
    if (cached) {
      setUrl(cached);
      return undefined;
    }

    let cancelled = false;

    getS3SignedUrl(key)
      .then((signedUrl) => {
        if (cancelled) {
          return;
        }

        if (signedUrl) {
          urlCache.set(key, signedUrl);
          setUrl(signedUrl);
          return;
        }

        setUrl(null);
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return url;
}
