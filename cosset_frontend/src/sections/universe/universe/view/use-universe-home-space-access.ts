'use client';

import { useMemo } from 'react';

import { useGetGuestArea } from 'src/actions/guestarea';
import { useAuthContext } from 'src/auth/hooks';
import { isGuestAreaHomeSpaceOnlyMotif } from 'src/utils/guest-area-status';

// ----------------------------------------------------------------------

type UniverseHomeSpaceAccess = {
  isOwner: boolean;
  isAccessLoading: boolean;
  isVisitorHomeSpaceOnly: boolean;
};

export function useUniverseHomeSpaceAccess(customerId: string): UniverseHomeSpaceAccess {
  const { user, loading } = useAuthContext();
  const { guestarea, guestAreaLoading } = useGetGuestArea(customerId);

  const normalizedCustomerId = String(customerId || '').trim();
  const viewerId = user?.id ? String(user.id).trim() : '';

  return useMemo(() => {
    if (!normalizedCustomerId) {
      return {
        isOwner: false,
        isAccessLoading: false,
        isVisitorHomeSpaceOnly: false,
      };
    }

    const isOwner = !loading && !!viewerId && viewerId === normalizedCustomerId;
    const isVisitor = !loading && !isOwner;

    return {
      isOwner,
      isAccessLoading: loading || guestAreaLoading,
      isVisitorHomeSpaceOnly: isVisitor && isGuestAreaHomeSpaceOnlyMotif(guestarea?.motif),
    };
  }, [guestAreaLoading, guestarea?.motif, loading, normalizedCustomerId, viewerId]);
}
