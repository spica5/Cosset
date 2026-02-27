'use client';

import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { useGetGuestAreas } from 'src/actions/guestarea';
import { useGetUsers } from 'src/actions/user';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { FriendCardList } from '../friend-card-list';

// ----------------------------------------------------------------------

export function FriendCardsView() {
  const { users, usersLoading } = useGetUsers(200, 0);
  const { guestAreas, guestAreasLoading } = useGetGuestAreas();
  const defaultCoverImage = `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template1.jpg`;

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

  const friends = users.map((user) => {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const guestArea = guestAreaByCustomerId[user.id];

    return {
      id: user.id,
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

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Friends"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Friends', href: paths.dashboard.friend },
          { name: 'List' }
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {usersLoading || guestAreasLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading users...
        </Typography>
      ) : (
        <FriendCardList friends={friends} />
      )}
    </DashboardContent>
  );
}
