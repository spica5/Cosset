'use client';

import { paths } from 'src/routes/paths';

import { _friendCards } from 'src/_mock/dashboard';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { FriendCardList } from '../friend-card-list';

// ----------------------------------------------------------------------

export function FriendCardsView() {
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

      <FriendCardList friends={_friendCards} />
    </DashboardContent>
  );
}
