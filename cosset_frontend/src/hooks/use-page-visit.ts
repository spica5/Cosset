'use client';

import { useRef, useEffect } from 'react';

import { recordPageVisit, type PageVisitKey } from 'src/actions/page-visit';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * Records one visit per pageKey + viewer identity.
 * Waits for auth to finish loading so signed-in customers are attributed correctly.
 */
export function usePageVisit(pageKey?: PageVisitKey | string | null, label?: string) {
  const { user, loading } = useAuthContext();
  const recordedStampRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const key = String(pageKey || '').trim();
    if (!key) {
      return undefined;
    }

    const viewerIdentity = user?.id ? `user:${String(user.id)}` : 'anon';
    const stamp = `${key}|${viewerIdentity}`;

    if (recordedStampRef.current === stamp) {
      return undefined;
    }

    let cancelled = false;
    const path = typeof window !== 'undefined' ? window.location.pathname : undefined;

    recordPageVisit({ pageKey: key, label, path }).then((ok) => {
      if (!cancelled && ok) {
        recordedStampRef.current = stamp;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pageKey, label, loading, user?.id]);
}
