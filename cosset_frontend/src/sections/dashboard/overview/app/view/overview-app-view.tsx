'use client';

import Grid from '@mui/material/Unstable_Grid2';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { AppWelcome } from '../app-welcome';
import { OverviewContentStats } from '../overview-content-stats';
import { OverviewUpcomingCinema } from '../overview-upcoming-cinema';
import { OverviewRecentPosts } from '../overview-recent-posts';
import { OverviewTopShops } from '../overview-top-shops';
import { OverviewBrandsBoulevard } from '../overview-brands-boulevard';
import { OverviewNeighbors } from '../overview-neighbors';
import { OverviewFriends } from '../overview-friends';

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const { user } = useAuthContext();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Dashboard"
        links={[{ name: 'Dashboard' }]}
        sx={{ mb: { xs: 2, md: 3 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12}>
          <AppWelcome
            title={`Hi ${user?.displayName || ''}, Welcome to Cosset.`}
            description="This place is to focus on the freedom of each individual, which offers its own space for every young one to get away from this dizzy world.
            You can keep what you cosset like a love story in a fragrant pretty drawer or sometimes it is just a memory of a cozy date with friends and family."
          />
        </Grid>

        <Grid xs={12}>
          <OverviewContentStats />
        </Grid>

        <Grid xs={12}>
          <OverviewUpcomingCinema />
        </Grid>

        <Grid xs={12} md={6}>
          <OverviewRecentPosts />
        </Grid>

        <Grid xs={12} md={6}>
          <OverviewTopShops />
        </Grid>

        <Grid xs={12}>
          <OverviewBrandsBoulevard />
        </Grid>

        <Grid xs={12} md={6}>
          <OverviewNeighbors />
        </Grid>

        <Grid xs={12} md={6}>
          <OverviewFriends />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
