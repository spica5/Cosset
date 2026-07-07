'use client';

import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

// ----------------------------------------------------------------------

export function JourneyDiaryView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Journey Diary"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Journey Diary' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Typography variant="body1" color="text.secondary">
        Your journey diary will appear here.
      </Typography>
    </DashboardContent>
  );
}
