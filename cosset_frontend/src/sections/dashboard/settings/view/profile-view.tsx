'use client';

import Stack from '@mui/material/Stack';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { ProfileForm } from '../profile-form';

// ---------------------------------------------------------------

export function ProfileView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs    
        heading="Profile Settings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.settings.profile },
          { name: 'Profile Settings' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <ProfileForm />
      </Stack>
    </DashboardContent>
  );
}
