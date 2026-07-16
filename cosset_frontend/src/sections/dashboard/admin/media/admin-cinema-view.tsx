'use client';

import { useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { CINEMA_CATEGORIES } from 'src/sections/dashboard/cinema/cinema-categories';
import { CinemaCategoryFilmsPanel } from 'src/sections/dashboard/cinema/cinema-category-films-panel';

// ----------------------------------------------------------------------

export function AdminCinemaView() {
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
          heading="Manage Cinema"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Admin', href: paths.dashboard.admin.media.root },
            { name: 'Media', href: paths.dashboard.admin.media.root },
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
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Admin access required</Typography>
            <Typography variant="body2">
              Only administrators can manage cinema content from Media.
            </Typography>
          </Stack>
        </Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Manage Cinema"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admin', href: paths.dashboard.admin.media.root },
          { name: 'Media', href: paths.dashboard.admin.media.root },
          { name: 'Cinema' },
        ]}
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <Iconify icon="solar:clapperboard-play-bold" width={26} />
            </Box>
            <Box>
              <Typography variant="h5">Cinema</Typography>
              <Typography variant="body2" color="text.secondary">
                Add, update, and delete cinema films, and schedule showtimes for each room.
                Community → Cinema is where people reserve screenings and open the cinema.
              </Typography>
            </Box>
          </Stack>
        </Card>

        {CINEMA_CATEGORIES.map((category) => (
          <Card key={category.id} id={`cinema-${category.id}`} sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: `${category.accent}18`,
                    color: category.accent,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={category.icon} width={22} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6">{category.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category.description}
                  </Typography>
                </Box>
              </Stack>

              <CinemaCategoryFilmsPanel
                category={category}
                showScreenings
                canManage
              />
            </Stack>
          </Card>
        ))}
      </Stack>
    </DashboardContent>
  );
}
