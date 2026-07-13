'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import {
  CINEMA_CATEGORIES,
  type CinemaCategoryMeta,
} from '../cinema-categories';
import { CinemaCategoryFilmsPanel } from '../cinema-category-films-panel';
import { CinemaScreeningsTable } from '../cinema-screenings-table';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
};

export function CinemaCategoryView({ category }: Props) {
  const { user } = useAuthContext();
  const ownerId = String(user?.id || '');

  const handleVisitUniverse = () => {
    const url = ownerId
      ? `${paths.dashboard.community.cinema.view(category.id)}?ownerId=${encodeURIComponent(ownerId)}`
      : paths.dashboard.community.cinema.view(category.id);

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={category.shortTitle}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community', href: paths.dashboard.community.root },
          { name: 'Cinema', href: paths.dashboard.community.cinema.root },
          { name: category.shortTitle },
        ]}
        action={
          <Button
            onClick={handleVisitUniverse}
            variant="contained"
            startIcon={<Iconify icon="solar:video-frame-play-vertical-bold" />}
            sx={{ fontWeight: 700 }}
          >
            Enter Cinema Room
          </Button>
        }
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Stack spacing={3}>
        <Card
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 2.5,
            overflow: 'hidden',
            background: category.gradient,
            color: 'common.white',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.12)',
                color: category.accent,
                flexShrink: 0,
              }}
            >
              <Iconify icon={category.icon} width={36} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {category.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8 }}>
                {category.description}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)', mt: 1 }}>
                {category.tagline}
              </Typography>
            </Box>

            <Button
              onClick={handleVisitUniverse}
              size="large"
              variant="contained"
              endIcon={<Iconify icon="eva:external-link-fill" />}
              sx={{
                flexShrink: 0,
                bgcolor: category.accent,
                color: '#fff',
                fontWeight: 700,
                px: 3,
                '&:hover': { bgcolor: category.accent, opacity: 0.92 },
              }}
            >
              Open Universe Screen
            </Button>
          </Stack>

          <Box sx={{ mt: 3 }}>
            <CinemaScreeningsTable
              category={category}
              customerId={ownerId}
              variant="banner"
            />
          </Box>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <CinemaCategoryFilmsPanel category={category} showScreenings={false} />
        </Card>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {CINEMA_CATEGORIES.filter((item) => item.id !== category.id).map((item) => (
            <Card
              key={item.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Iconify icon={item.icon} width={22} sx={{ color: item.accent }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {item.shortTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.tagline}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          ))}
        </Box>
      </Stack>
    </DashboardContent>
  );
}
