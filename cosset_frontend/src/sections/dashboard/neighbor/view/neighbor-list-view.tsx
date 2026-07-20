'use client';

import type { INeighborItem } from 'src/types/neighbor';

import { useMemo, useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
  const [category, setCategory] = useState<'all' | 'friend'>('all');

  const { user: currentUser } = useAuthContext();
  const currentUserId = String(currentUser?.id || '');
  const { users, usersLoading } = useGetCommunityUsers(200, 0, Boolean(currentUserId));
  const { friends: acceptedRelations, friendsLoading } = useGetFriends(undefined, 'accepted', true);
  const { guestAreas, guestAreasLoading } = useGetGuestAreas();
  const { designSpaces, designSpacesLoading } = useGetDesignSpaces();
  const defaultCoverImage = `${CONFIG.dashboard.assetsDir}/assets/images/guest-area/cosset_default.png`;

  const friendCountByUserId = acceptedRelations.reduce<Record<string, number>>((acc, relation) => {
    const userId1 = String(relation.userId1 || '');
    const userId2 = String(relation.userId2 || '');

    if (userId1) {
      acc[userId1] = (acc[userId1] || 0) + 1;
    }

    if (userId2) {
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

    if (userId1 === currentUserId) {
      acc.add(userId2);
    } else if (userId2 === currentUserId) {
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

  const mappedNeighbors: INeighborItem[] = users
    .filter((user) => String(user.role || '').trim().toLowerCase() !== 'business')
    .map((user) => {
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
        ...mappedNeighbors.filter((neighbor) => neighbor.id !== String(currentUser.id)),
      ]
    : mappedNeighbors;

  const categoryFiltered = useMemo(
    () =>
      category === 'friend'
        ? neighbors.filter((neighbor) => neighbor.isFriend)
        : neighbors,
    [category, neighbors]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery) return categoryFiltered;

    const query = searchQuery.toLowerCase();
    return categoryFiltered.filter((neighbor) => neighbor.name.toLowerCase().includes(query));
  }, [categoryFiltered, searchQuery]);

  const handleSearch = useCallback((inputValue: string) => {
    setSearchQuery(inputValue);
  }, []);

  const handleChangeCategory = useCallback(
    (_event: React.MouseEvent<HTMLElement>, value: 'all' | 'friend' | null) => {
      if (value) {
        setCategory(value);
      }
    },
    []
  );

  const dataFiltered = searchQuery ? searchResults : categoryFiltered;

  const renderFilters = (
    <Stack
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ mb: { xs: 3, md: 4 } }}
    >
      <NeighborSearch query={searchQuery} results={searchResults} onSearch={handleSearch} />

      <ToggleButtonGroup
        exclusive
        size="small"
        value={category}
        onChange={handleChangeCategory}
        color="primary"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="friend">Friends</ToggleButton>
      </ToggleButtonGroup>
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
          description={
            category === 'friend'
              ? 'No friends found in neighbors for this filter.'
              : 'Try a different name or category.'
          }
          sx={{ py: 10 }}
        />
      )}
    </DashboardContent>
  );
}
