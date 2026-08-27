'use client';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { AccountRecoveryCard } from '../account-recovery-card';
import { ChangePasswordCard } from '../change-password-card';

// ----------------------------------------------------------------------

export function PasswordRecoveryView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Password & Recovery"
        links={[
          { name: 'Dashboard', href: paths.dashboard.settings.root },
          { name: 'Password & Recovery' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={4}>
        <ChangePasswordCard />
        <AccountRecoveryCard />
      </Stack>
    </DashboardContent>
  );
}
