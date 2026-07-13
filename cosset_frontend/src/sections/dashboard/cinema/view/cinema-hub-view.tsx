'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { CINEMA_CATEGORIES, type CinemaCategoryMeta } from '../cinema-categories';
import { CinemaCategoryFilmsPanel } from '../cinema-category-films-panel';
import { CinemaScreeningsTable } from '../cinema-screenings-table';

// ----------------------------------------------------------------------

function CinemaCategorySection({ category, ownerId }: { category: CinemaCategoryMeta; ownerId: string }) {
  const universeUrl = ownerId
    ? `${paths.dashboard.community.cinema.view(category.id)}?ownerId=${encodeURIComponent(ownerId)}`
    : paths.dashboard.community.cinema.view(category.id);

  return (
    <Card
      id={`cinema-${category.id}`}
      sx={{
        overflow: 'hidden',
        borderRadius: 2.5,
      }}
    >
      <Box
        sx={{
          p: { xs: 2.5, md: 3 },
          background: category.gradient,
          color: 'common.white',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.12)',
                color: category.accent,
                flexShrink: 0,
              }}
            >
              <Iconify icon={category.icon} width={28} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {category.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                {category.tagline}
              </Typography>
            </Box>
          </Stack>

          <Button
            component={RouterLink}
            href={universeUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<Iconify icon="eva:external-link-fill" />}
            sx={{
              flexShrink: 0,
              bgcolor: category.accent,
              color: '#fff',
              fontWeight: 700,
              '&:hover': { bgcolor: category.accent, opacity: 0.92 },
            }}
          >
            Enter Cinema Room
          </Button>
        </Stack>

        <Typography
          variant="body2"
          sx={{ color: 'rgba(255,255,255,0.82)', mt: 2, lineHeight: 1.8, maxWidth: 760 }}
        >
          {category.description}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <CinemaScreeningsTable
            category={category}
            customerId={ownerId}
            compact
            variant="banner"
          />
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 2.5 }, bgcolor: 'background.paper' }}>
        <CinemaCategoryFilmsPanel category={category} compact showScreenings={false} />
      </Box>
    </Card>
  );
}

export function CinemaHubView() {
  const { user } = useAuthContext();
  const ownerId = String(user?.id || '');

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

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <Iconify icon="solar:video-frame-play-vertical-bold" width={28} />
            </Box>
            <Box>
              <Typography variant="h4">Cinema</Typography>
              <Typography variant="body2" color="text.secondary">
                Three screening rooms for your universe — classic films, genre nights, and drama & comedy features.
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Stack spacing={2.5}>
          {CINEMA_CATEGORIES.map((category) => (
            <CinemaCategorySection key={category.id} category={category} ownerId={ownerId} />
          ))}
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
