'use client';

import type { INeighborItem } from 'src/types/neighbor';

import { useMemo, useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { useGetCommunityUsers } from 'src/actions/user';
import { useGetFriends } from 'src/actions/friend';
import { useGetGuestAreas } from 'src/actions/guestarea';
import { useGetDesignSpaces } from 'src/actions/design-space';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { NeighborList } from '../neighbor-list';
import { NeighborSearch } from '../neighbor-search';

// ----------------------------------------------------------------------

export function NeighborListView() {
  const [searchQuery, setSearchQuery] = useState('');

  const { user: currentUser } = useAuthContext();
  const currentUserId = String(currentUser?.id || '');
  const { users, usersLoading } = useGetCommunityUsers(200, 0, Boolean(currentUserId));
  const { friends: acceptedRelations, friendsLoading } = useGetFriends(undefined, 'accepted', true);
  const { guestAreas, guestAreasLoading } = useGetGuestAreas();
  const { designSpaces, designSpacesLoading } = useGetDesignSpaces();
  const defaultCoverImage = `${CONFIG.dashboard.assetsDir}/assets/images/guest-area/cosset_default.png`;

  const isActiveCustomer = (user: Record<string, any>) => {
    const role = String(user.role || '')
      .trim()
      .toLowerCase();
    if (role === 'business') return false;

    const state = String(user.state || user.status || 'active')
      .trim()
      .toLowerCase();

    return state === 'active' || state === '';
  };

  const activeUsers = useMemo(() => users.filter(isActiveCustomer), [users]);
  const activeUserIds = useMemo(
    () => new Set(activeUsers.map((user) => String(user.id || '')).filter(Boolean)),
    [activeUsers]
  );

  const friendCountByUserId = acceptedRelations.reduce<Record<string, number>>((acc, relation) => {
    const userId1 = String(relation.userId1 || '');
    const userId2 = String(relation.userId2 || '');

    // Only count friendships between active customers.
    if (userId1 && userId2 && activeUserIds.has(userId1) && activeUserIds.has(userId2)) {
      acc[userId1] = (acc[userId1] || 0) + 1;
      acc[userId2] = (acc[userId2] || 0) + 1;
    }

    return acc;
  }, {});

  const currentUserFriendIds = acceptedRelations.reduce<Set<string>>((acc, relation) => {
    const userId1 = String(relation.userId1 || '');
    const userId2 = String(relation.userId2 || '');

    if (!currentUserId) {
      return acc;
    }

    if (userId1 === currentUserId && activeUserIds.has(userId2)) {
      acc.add(userId2);
    } else if (userId2 === currentUserId && activeUserIds.has(userId1)) {
      acc.add(userId1);
    }

    return acc;
  }, new Set<string>());

  const parseImageList = (value: string | null | undefined): string[] => {
    if (!value) return [];

    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
      return [];
    }

    if (!trimmed.startsWith('[')) {
      return [trimmed];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is string =>
          typeof item === 'string' && !!item.trim() && item.trim() !== 'null' && item.trim() !== 'undefined'
      );
    } catch {
      return [];
    }
  };

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

  const designSpaceByCustomerId = designSpaces.reduce<
    Record<string, { background: string | null; rooms: string | null }>
  >((acc, item) => {
    if (item?.customerId && !acc[item.customerId]) {
      acc[item.customerId] = {
        background: item.background || null,
        rooms: item.rooms || null,
      };
    }
    return acc;
  }, {});

  const mappedNeighbors: INeighborItem[] = activeUsers.map((user) => {
    const userId = String(user.id || '');
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const guestArea = guestAreaByCustomerId[user.id];
    const coverUrl = guestArea?.coverUrl || defaultCoverImage;
    const createdAt = user?.createdAt || new Date().toISOString();
    const designSpace = designSpaceByCustomerId[user.id];
    const backgroundImages = parseImageList(designSpace?.background);
    const roomImages = parseImageList(designSpace?.rooms);

    const image1 = backgroundImages[0] || roomImages[0];
    const image2 = backgroundImages[1] || roomImages[1];
    const friendCount = friendCountByUserId[userId] || 0;
    const isFriend = currentUserId ? currentUserFriendIds.has(userId) : false;

    return {
      id: userId,
      isCurrentUser: currentUserId ? userId === currentUserId : false,
      name: fullName || user.email || 'Unknown User',
      isFriend,
      universeName: guestArea?.title || 'No guest area title',
      mood: guestArea?.mood || 'No guest area mood',
      motif: guestArea?.motif || 'No guest area motif',
      openness: user.isPublic ? 'Public' : 'Private',
      friends: Array.from({ length: friendCount }, (_, index) => ({
        id: `${userId}-friend-${index}`,
        name: '',
        friends: 0,
        avatarUrl: '',
      })),
      totalViews: 0,
      content: '',
      publish: 'published',
      images: [coverUrl, image1, image2],
      ratingNumber: friendCount,
      email: user.email || '',
      avatarUrl: user.photoURL || user.avatarUrl || '',
      createdAt,
      available: {
        startDate: createdAt,
        endDate: createdAt,
      },
    };
  });

  const neighbors = currentUser?.id
    ? [
        ...mappedNeighbors.filter((neighbor) => neighbor.id === String(currentUser.id)),
        ...mappedNeighbors.filter(
          (neighbor) => neighbor.id !== String(currentUser.id) && !neighbor.isFriend
        ),
      ]
    : mappedNeighbors.filter((neighbor) => !neighbor.isFriend);

  const searchResults = useMemo(() => {
    if (!searchQuery) return neighbors;

    const query = searchQuery.toLowerCase();
    return neighbors.filter((neighbor) => neighbor.name.toLowerCase().includes(query));
  }, [neighbors, searchQuery]);

  const handleSearch = useCallback((inputValue: string) => {
    setSearchQuery(inputValue);
  }, []);

  const dataFiltered = searchQuery ? searchResults : neighbors;

  const renderFilters = (
    <Stack
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ mb: { xs: 3, md: 4 } }}
    >
      <NeighborSearch query={searchQuery} results={searchResults} onSearch={handleSearch} />
    </Stack>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Neighbors"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Neighbors', href: paths.dashboard.community.neighbor.root },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {renderFilters}

      {usersLoading || friendsLoading || guestAreasLoading || designSpacesLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading neighbors...
        </Typography>
      ) : dataFiltered.length ? (
        <NeighborList neighbors={dataFiltered} />
      ) : (
        <EmptyContent
          filled
          title="No neighbors found"
          description="Try a different name."
          sx={{ py: 10 }}
        />
      )}
    </DashboardContent>
  );
}
