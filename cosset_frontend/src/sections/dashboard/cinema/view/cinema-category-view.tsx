'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useGetCinemaFilms } from 'src/actions/cinema-film';

import { CinemaTheaterIntro } from '../cinema-theater-intro';
import { CinemaReservationsTable } from '../cinema-reservations-table';
import { CinemaCategoryFilmsPanel } from '../cinema-category-films-panel';
import {
  type CinemaCategoryMeta,
  getCinemaCategoryDashboardPath,
  cinemaShellSx,
  CINEMA_CATEGORIES,
} from '../cinema-categories';
import { CINEMA_CREAM } from '../cinema-theater-theme';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
};

export function CinemaCategoryView({ category }: Props) {
  const { user } = useAuthContext();
  const { id } = user || {};
  const viewerId = String(id || '');
  const accent = category.accent;

  const { films } = useGetCinemaFilms(null, category.id, { publicOnly: true });
  const catalogOwnerId = useMemo(() => {
    const fromFilm = films.find((film) => film.customerId)?.customerId;
    return fromFilm ? String(fromFilm) : '';
  }, [films]);

  const universeUrl = catalogOwnerId
    ? `${paths.dashboard.community.cinema.view(category.id)}?ownerId=${encodeURIComponent(catalogOwnerId)}`
    : paths.dashboard.community.cinema.view(category.id);

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
            component={RouterLink}
            href={universeUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            startIcon={<Iconify icon="solar:video-frame-play-vertical-bold" />}
            sx={{
              fontWeight: 700,
              bgcolor: accent,
              color: '#1A1208',
              '&:hover': { bgcolor: accent, opacity: 0.92 },
            }}
          >
            Enter Cinema Room
          </Button>
        }
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Stack spacing={3}>
        <Box sx={{ ...cinemaShellSx(category), p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: category.overlay,
              pointerEvents: 'none',
            }}
          />

          <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
            <CinemaTheaterIntro
              category={category}
              height={{ xs: 300, md: 460 }}
              footer={
                <Stack spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent="center">
                    {category.chips.map((chip) => (
                      <Box
                        key={chip}
                        sx={{
                          px: 1.25,
                          py: 0.35,
                          borderRadius: category.id === 'genre' ? 999 : 0.75,
                          typography: 'caption',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: accent,
                          border: `1px solid rgba(${category.accentRgb}, 0.45)`,
                          bgcolor: 'rgba(0,0,0,0.35)',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        {chip}
                      </Box>
                    ))}
                  </Stack>
                  <Button
                    component={RouterLink}
                    href={universeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    endIcon={<Iconify icon="solar:play-bold" />}
                    sx={{
                      bgcolor: accent,
                      color: category.id === 'genre' ? '#14060A' : '#1A1208',
                      fontWeight: 800,
                      px: 2.5,
                      borderRadius: category.id === 'genre' ? 999 : 1,
                      '&:hover': { bgcolor: accent, opacity: 0.92 },
                    }}
                  >
                    Open Universe Screen
                  </Button>
                </Stack>
              }
            />

            <CinemaReservationsTable
              category={category}
              customerId={viewerId}
              ownerCustomerId={catalogOwnerId || undefined}
              variant="banner"
            />
          </Stack>
        </Box>

        <Box
          sx={{
            ...cinemaShellSx(category),
            p: { xs: 2, md: 3 },
          }}
        >
          <Box
            sx={{
              '& .MuiTypography-root': { color: category.textColor },
            }}
          >
            <CinemaCategoryFilmsPanel
              category={category}
              showScreenings={false}
              canManage={false}
              scheduledOnly
              publicCatalog
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {CINEMA_CATEGORIES.filter((item) => item.id !== category.id).map((item) => (
            <Box
              key={item.id}
              component={RouterLink}
              href={getCinemaCategoryDashboardPath(item.id)}
              sx={{
                p: 2,
                borderRadius: 2,
                textDecoration: 'none',
                color: 'inherit',
                border: `1px solid ${item.accent}44`,
                background: item.gradient,
                transition: (theme) =>
                  theme.transitions.create(['transform', 'border-color'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: item.accent,
                },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Iconify icon={item.icon} width={22} sx={{ color: item.accent }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ color: CINEMA_CREAM }}>
                    {item.shortTitle}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ color: 'rgba(245,230,200,0.68)' }}>
                    {item.tagline}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </DashboardContent>
  );
}
