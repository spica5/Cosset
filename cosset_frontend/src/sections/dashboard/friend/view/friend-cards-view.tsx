'use client';

import { useMemo, useState, useCallback } from 'react';

import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { useGetUsers } from 'src/actions/user';
import {
  useGetFriends,
  removeFriend,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
} from 'src/actions/friend';
import { useGetGuestAreas } from 'src/actions/guestarea';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { FriendCardList } from '../friend-card-list';

// ----------------------------------------------------------------------

export function FriendCardsView() {
  const [processingRelationId, setProcessingRelationId] = useState<number | null>(null);

  const { user: currentUser } = useAuthContext();
  const currentUserId = String(currentUser?.id || '').trim();
  const canLoadFriends = !!currentUserId;

  const { friends: acceptedRelations, friendsLoading: acceptedFriendsLoading } = useGetFriends(
    currentUserId,
    'accepted',
    canLoadFriends
  );
  const { friends: pendingRelations, friendsLoading: pendingFriendsLoading } = useGetFriends(
    currentUserId,
    'pending',
    canLoadFriends
  );
  const { users, usersLoading } = useGetUsers(200, 0);
  const { guestAreas, guestAreasLoading } = useGetGuestAreas();
  const defaultCoverImage = `${CONFIG.dashboard.assetsDir}/assets/images/guest-area/cosset_default.png`;

  const acceptedFriendUserIds = useMemo(() => {
    if (!canLoadFriends) return new Set<string>();

    return new Set<string>(
      acceptedRelations.map((item) =>
        item.userId1 === currentUserId ? item.userId2 : item.userId1
      )
    );
  }, [acceptedRelations, canLoadFriends, currentUserId]);

  const acceptedRelationIdByOtherUserId = useMemo(() => {
    const map = new Map<string, number>();
    acceptedRelations.forEach((item) => {
      const otherUserId = item.userId1 === currentUserId ? item.userId2 : item.userId1;
      map.set(otherUserId, item.id);
    });
    return map;
  }, [acceptedRelations, currentUserId]);

  const pendingRelationsByOtherUserId = useMemo(() => {
    const map = new Map<string, { relationId: number; direction: 'incoming' | 'outgoing' }>();

    pendingRelations.forEach((item) => {
      const isIncoming = item.userId2 === currentUserId;
      const otherUserId = isIncoming ? item.userId1 : item.userId2;

      map.set(otherUserId, {
        relationId: item.id,
        direction: isIncoming ? 'incoming' : 'outgoing',
      });
    });

    return map;
  }, [currentUserId, pendingRelations]);

  const pendingUserIds = useMemo(
    () => new Set<string>(Array.from(pendingRelationsByOtherUserId.keys())),
    [pendingRelationsByOtherUserId]
  );

  const guestAreaByCustomerId = guestAreas.reduce<
    Record<string, { coverUrl: string; title: string; motif: string; mood: string }>
  >((acc, item) => {
    if (item?.customerId && !acc[item.customerId]) {
      acc[item.customerId] = {
        coverUrl: item.coverUrl || defaultCoverImage,
        title: item.title || '',
        motif: item.motif || '',
        mood: item.mood || '',
      };
    }
    return acc;
  }, {});

  const mappedAcceptedFriends = users
    .filter((user) => acceptedFriendUserIds.has(String(user.id)))
    .map((user) => {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const guestArea = guestAreaByCustomerId[user.id];

    return {
      id: user.id,
        relationId: acceptedRelationIdByOtherUserId.get(String(user.id)),
        relationStatus: 'accepted' as const,
      name: fullName || user.email || 'Unknown User',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      plan: user.plan || 'FREE',
      country: user.country || '',
      city: user.city || '',
      universeName: guestArea?.title || 'No guest area title',
      mood: guestArea?.mood || 'No guest area mood',
      motif: guestArea?.motif || 'No guest area motif',
      role: user.role || 'user',
      coverUrl: guestArea?.coverUrl || defaultCoverImage,
      avatarUrl: user.photoURL || '',
      connections: 0,
      ratingNumber: 0,
      openness: user.isPublic ? 'Public' : 'Private',
    };
  });

  const mappedPendingFriends = users
    .filter((user) => pendingUserIds.has(String(user.id)))
    .map((user) => {
      const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      const guestArea = guestAreaByCustomerId[user.id];
      const relation = pendingRelationsByOtherUserId.get(String(user.id));

      return {
        id: user.id,
        relationId: relation?.relationId,
        relationStatus: 'pending' as const,
        pendingDirection: relation?.direction,
        requestMessage:
          relation?.direction === 'incoming'
            ? `${fullName || user.email || 'This user'} sent you a friend request.`
            : `Friend request sent to ${fullName || user.email || 'this user'}.`,
        name: fullName || user.email || 'Unknown User',
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        plan: user.plan || 'FREE',
        country: user.country || '',
        city: user.city || '',
        universeName: guestArea?.title || 'No guest area title',
        mood: guestArea?.mood || 'No guest area mood',
        motif: guestArea?.motif || 'No guest area motif',
        role: user.role || 'user',
        coverUrl: guestArea?.coverUrl || defaultCoverImage,
        avatarUrl: user.photoURL || '',
        connections: 0,
        ratingNumber: 0,
        openness: user.isPublic ? 'Public' : 'Private',
      };
    });

  const friends = [...mappedPendingFriends, ...mappedAcceptedFriends];

  const handleAccept = useCallback(
    async (relationId?: number) => {
      if (!relationId || !currentUserId) return;
      setProcessingRelationId(relationId);
      try {
        await acceptFriendRequest(relationId, currentUserId);
      } finally {
        setProcessingRelationId(null);
      }
    },
    [currentUserId]
  );

  const handleReject = useCallback(
    async (relationId?: number) => {
      if (!relationId || !currentUserId) return;
      setProcessingRelationId(relationId);
      try {
        await rejectFriendRequest(relationId, currentUserId);
      } finally {
        setProcessingRelationId(null);
      }
    },
    [currentUserId]
  );

  const handleCancel = useCallback(
    async (relationId?: number) => {
      if (!relationId || !currentUserId) return;
      setProcessingRelationId(relationId);
      try {
        await cancelFriendRequest(relationId, currentUserId);
      } finally {
        setProcessingRelationId(null);
      }
    },
    [currentUserId]
  );

  const handleRemove = useCallback(
    async (relationId?: number) => {
      if (!relationId || !currentUserId) return;
      setProcessingRelationId(relationId);
      try {
        await removeFriend(relationId, currentUserId);
      } finally {
        setProcessingRelationId(null);
      }
    },
    [currentUserId]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Friends"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Friends', href: paths.dashboard.community.friend },
          { name: 'List' }
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {acceptedFriendsLoading || pendingFriendsLoading || usersLoading || guestAreasLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading friends...
        </Typography>
      ) : friends.length === 0 ? (
        <EmptyContent
          filled
          title="No friends yet"
          description="Add friends to see them here."
          sx={{ py: 10 }}
        />
      ) : (
        <FriendCardList
          friends={friends}
          processingRelationId={processingRelationId}
          onAccept={(friend) => handleAccept(friend.relationId)}
          onReject={(friend) => handleReject(friend.relationId)}
          onCancel={(friend) => handleCancel(friend.relationId)}
          onRemove={(friend) => handleRemove(friend.relationId)}
        />
      )}
    </DashboardContent>
  );
}
