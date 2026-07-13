'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/universe/iconify';

import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import { getCinemaCategory, isCinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';
import {
  formatScreeningSchedule,
  getDefaultScreening,
  getScreeningShowStatus,
  getCinemaFilmShowStatusLabel,
} from 'src/sections/dashboard/cinema/cinema-film-schedule';

// ----------------------------------------------------------------------

type Props = {
  categoryId: string;
  ownerId?: string;
};

export function UniverseCinemaView({ categoryId, ownerId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const category = getCinemaCategory(categoryId);
  const resolvedOwnerId = ownerId || String(user?.id || '');
  const resolvedCategory = category && isCinemaCategory(categoryId) ? category.id : null;
  const canFetch = Boolean(resolvedOwnerId && resolvedCategory);

  const { films, filmsLoading } = useGetCinemaFilms(
    canFetch ? resolvedOwnerId : null,
    canFetch ? resolvedCategory : null,
    { publicOnly: true },
  );

  const { screenings, screeningsLoading } = useGetCinemaScreenings(
    canFetch ? resolvedOwnerId : null,
    canFetch ? resolvedCategory : null,
    { publicOnly: true },
  );

  const [activeScreeningId, setActiveScreeningId] = useState<number | null>(null);

  const defaultScreening = useMemo(() => getDefaultScreening(screenings), [screenings]);

  const activeScreening = useMemo(
    () => screenings.find((screening) => screening.id === activeScreeningId) || defaultScreening,
    [activeScreeningId, defaultScreening, screenings],
  );

  const activeFilm = useMemo(() => {
    if (!activeScreening) {
      return films[0] || null;
    }

    return (
      films.find((film) => film.id === activeScreening.filmId) || {
        id: activeScreening.filmId,
        customerId: activeScreening.customerId,
        category: resolvedCategory || 'classic',
        title: activeScreening.filmTitle,
        director: activeScreening.filmDirector,
        year: activeScreening.filmYear,
        description: activeScreening.filmDescription,
        posterImage: activeScreening.filmPosterImage,
        videoUrl: activeScreening.filmVideoUrl,
      }
    );
  }, [activeScreening, films, resolvedCategory]);

  const loading = filmsLoading || screeningsLoading;

  if (!category) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#050508',
        color: 'common.white',
        background: category.gradient,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 42%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.55), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2, md: 4 },
          py: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Iconify icon={category.icon} width={24} sx={{ color: category.accent }} />
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: '0.16em' }}>
              Universe Cinema
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {category.title}
            </Typography>
          </Box>
        </Stack>

        <Button
          onClick={() => router.back()}
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          sx={{ fontWeight: 700 }}
        >
          Back
        </Button>
      </Stack>

      <Stack
        spacing={4}
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 80px)',
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Box
          sx={{
            width: 'min(920px, 100%)',
            mx: 'auto',
            aspectRatio: '16 / 9',
            borderRadius: 3,
            border: `2px solid ${category.accent}`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset`,
            bgcolor: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {loading ? (
            <CircularProgress sx={{ color: category.accent }} />
          ) : activeFilm ? (
            <Stack spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1, px: 2 }}>
              <Iconify icon="solar:video-frame-play-vertical-bold" width={56} sx={{ color: category.accent }} />
              <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>
                {activeFilm.title}
              </Typography>
              {activeFilm.director || activeFilm.year ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  {[activeFilm.director, activeFilm.year].filter(Boolean).join(' · ')}
                </Typography>
              ) : null}
              {activeScreening && formatScreeningSchedule(activeScreening) ? (
                <Stack spacing={0.75} alignItems="center">
                  {getCinemaFilmShowStatusLabel(getScreeningShowStatus(activeScreening)) ? (
                    <Chip
                      size="small"
                      label={getCinemaFilmShowStatusLabel(getScreeningShowStatus(activeScreening))}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: 'common.white',
                        fontWeight: 700,
                      }}
                    />
                  ) : null}
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', textAlign: 'center' }}>
                    {formatScreeningSchedule(activeScreening)}
                  </Typography>
                </Stack>
              ) : null}
              {activeFilm.description ? (
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.68)', textAlign: 'center', maxWidth: 520, lineHeight: 1.7 }}
                >
                  {activeFilm.description}
                </Typography>
              ) : null}
              <Button
                component={Link}
                href={activeFilm.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                endIcon={<Iconify icon="eva:external-link-fill" />}
                sx={{
                  mt: 1,
                  bgcolor: category.accent,
                  color: '#fff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: category.accent, opacity: 0.92 },
                }}
              >
                Watch now
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1, px: 2 }}>
              <Iconify icon="solar:video-frame-play-vertical-bold" width={56} sx={{ color: category.accent }} />
              <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>
                {category.shortTitle}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 520, lineHeight: 1.7 }}
              >
                {category.description}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ width: 'min(920px, 100%)', mx: 'auto' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Screening schedule
          </Typography>

          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} sx={{ color: category.accent }} />
            </Stack>
          ) : screenings.length ? (
            <Card
              sx={{
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'common.white',
              }}
            >
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.72)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        Film
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.72)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        Show time
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.72)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {screenings.map((screening) => {
                      const isActive = activeScreening?.id === screening.id;
                      const status = getScreeningShowStatus(screening);
                      const statusLabel = getCinemaFilmShowStatusLabel(status);

                      return (
                        <TableRow
                          key={screening.id}
                          hover
                          onClick={() => setActiveScreeningId(screening.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                          }}
                        >
                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {screening.filmTitle}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>
                              {[screening.filmDirector, screening.filmYear].filter(Boolean).join(' · ') ||
                                category.shortTitle}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                              {formatScreeningSchedule(screening)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                            {statusLabel ? (
                              <Chip
                                size="small"
                                label={statusLabel}
                                sx={{
                                  height: 22,
                                  bgcolor:
                                    status === 'now'
                                      ? 'rgba(76, 175, 80, 0.24)'
                                      : status === 'upcoming'
                                        ? 'rgba(33, 150, 243, 0.24)'
                                        : 'rgba(255,255,255,0.08)',
                                  color: 'common.white',
                                  fontWeight: 700,
                                }}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.8 }}>
              No public screenings scheduled in this room yet.
            </Typography>
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          <Button
            component={RouterLink}
            href={paths.dashboard.community.cinema.root}
            variant="outlined"
            color="inherit"
            sx={{
              borderColor: 'rgba(255,255,255,0.28)',
              fontWeight: 700,
              '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Manage in Dashboard
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
