'use client';

import { useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function CommunityCinemaAdminLayout({ children }: Props) {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const isAdmin = isUserAdmin(user?.role);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace(paths.dashboard.root);
    }
  }, [isAdmin, loading, router, user]);

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Cinema"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community', href: paths.dashboard.community.root },
            { name: 'Cinema' },
          ]}
          sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
        />

        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} href={paths.dashboard.root} color="inherit" size="small">
              Go back
            </Button>
          }
        >
          Community Cinema is available to admin accounts only.
        </Alert>
      </DashboardContent>
    );
  }

  return <>{children}</>;
}
