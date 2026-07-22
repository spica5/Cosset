'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';

import { useMemo, useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import {
  createCinemaReservation,
  useGetCinemaReservations,
} from 'src/actions/cinema-film-reservation';

import { CinemaFilmPosterCarousel } from '../cinema-film-poster-carousel';
import { CINEMA_CATEGORIES, type CinemaCategoryMeta } from '../cinema-categories';
import { CinemaReservationsTable } from '../cinema-reservations-table';
import { formatScreeningSchedule, getNextFilmScreening } from '../cinema-film-schedule';
import { CinemaSeatMapDialog } from '../cinema-seat-map-dialog';
import { CinemaTheaterIntro } from '../cinema-theater-intro';
import { CINEMA_CREAM, CINEMA_SERIF, cinemaPageShellSx } from '../cinema-theater-theme';

// ----------------------------------------------------------------------

function CinemaCategoryRoom({
  category,
  viewerId,
}: {
  category: CinemaCategoryMeta;
  viewerId: string;
}) {
  const { films, filmsLoading } = useGetCinemaFilms(null, category.id, { publicOnly: true });
  const { screenings, screeningsLoading } = useGetCinemaScreenings(null, category.id, {
    publicOnly: true,
  });
  const { reservations } = useGetCinemaReservations(viewerId || null, {
    category: category.id,
    status: 'reserved',
  });
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapMode, setSeatMapMode] = useState<'select' | 'view'>('select');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [reservingFilm, setReservingFilm] = useState<ICinemaFilm | null>(null);
  const [viewingReservation, setViewingReservation] =
    useState<ICinemaFilmReservationWithScreening | null>(null);
  const [confirming, setConfirming] = useState(false);
  const accent = category.accent;

  const catalogOwnerId = useMemo(() => {
    const fromFilm = films.find((film) => film.customerId)?.customerId;
    return fromFilm ? String(fromFilm) : '';
  }, [films]);

  const reservationsByScreeningId = useMemo(() => {
    const map = new Map<number, ICinemaFilmReservationWithScreening>();
    reservations.forEach((reservation) => {
      map.set(reservation.screeningId, reservation);
    });
    return map;
  }, [reservations]);

  const reservedScreeningIds = useMemo(
    () => new Set(reservationsByScreeningId.keys()),
    [reservationsByScreeningId],
  );

  const scheduledFilms = useMemo(() => {
    const screeningsByFilmId = screenings.reduce<Record<number, typeof screenings>>((acc, screening) => {
      const list = acc[screening.filmId] || [];
      list.push(screening);
      acc[screening.filmId] = list;
      return acc;
    }, {});

    return films.flatMap((film) => {
      const fromApi = screeningsByFilmId[film.id] || [];
      const nested = Array.isArray(film.screenings) ? film.screenings : [];
      const merged = fromApi.length ? fromApi : nested;

      return merged.length ? [{ ...film, screenings: merged }] : [];
    });
  }, [films, screenings]);

  const universeUrl = catalogOwnerId
    ? `${paths.dashboard.community.cinema.view(category.id)}?ownerId=${encodeURIComponent(catalogOwnerId)}`
    : paths.dashboard.community.cinema.view(category.id);

  const loading = filmsLoading || screeningsLoading;

  const reservingScreening = reservingFilm ? getNextFilmScreening(reservingFilm) : null;

  const seatSession = useMemo(() => {
    if (seatMapMode === 'view' && viewingReservation) {
      return {
        cinemaName: 'Cosset Cinema',
        sessionLabel:
          formatScreeningSchedule(viewingReservation) || 'Scheduled screening',
        roomLabel: category.title,
      };
    }

    return {
      cinemaName: 'Cosset Cinema',
      sessionLabel: reservingScreening
        ? formatScreeningSchedule(reservingScreening) || 'Scheduled screening'
        : 'Scheduled screening',
      roomLabel: category.title,
    };
  }, [category.title, reservingScreening, seatMapMode, viewingReservation]);

  const handleOpenSeatMap = useCallback(
    (film: ICinemaFilm) => {
      const screening = getNextFilmScreening(film);
      const existing = screening ? reservationsByScreeningId.get(screening.id) : null;

      if (existing) {
        setSeatMapMode('view');
        setViewingReservation(existing);
        setReservingFilm(null);
        setSelectedSeatIds(existing.seatIds || []);
        setSeatMapOpen(true);
        return;
      }

      if (!screening?.id) {
        toast.error('No screening is available to reserve for this film.');
        return;
      }

      setSeatMapMode('select');
      setViewingReservation(null);
      setReservingFilm(film);
      setSelectedSeatIds([]);
      setSeatMapOpen(true);
    },
    [reservationsByScreeningId],
  );

  const handleCloseSeatMap = useCallback(() => {
    if (confirming) return;
    setSeatMapOpen(false);
    setReservingFilm(null);
    setViewingReservation(null);
    setSelectedSeatIds([]);
    setSeatMapMode('select');
  }, [confirming]);

  const handleToggleSeat = useCallback((seatId: string) => {
    setSelectedSeatIds((prev) => (prev.includes(seatId) ? [] : [seatId]));
  }, []);

  const handleConfirmReserve = useCallback(async () => {
    const screening = reservingFilm ? getNextFilmScreening(reservingFilm) : null;
    const seatId = selectedSeatIds[0];

    if (!viewerId || !reservingFilm || !screening?.id || !seatId) {
      return;
    }

    const ownerCustomerId = String(reservingFilm.customerId || catalogOwnerId || '');

    try {
      setConfirming(true);
      await createCinemaReservation(
        { screeningId: screening.id, customerId: viewerId, seatIds: [seatId] },
        { ownerCustomerId: ownerCustomerId || undefined, category: category.id },
      );
      toast.success(`Reserved "${reservingFilm.title}" · seat ${seatId}.`);
      setSeatMapOpen(false);
      setReservingFilm(null);
      setViewingReservation(null);
      setSelectedSeatIds([]);
      setSeatMapMode('select');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to reserve screening.';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }, [catalogOwnerId, category.id, reservingFilm, selectedSeatIds, viewerId]);

  return (
    <Box
      id={`cinema-${category.id}`}
      sx={{
        ...cinemaPageShellSx,
        p: { xs: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 18%, rgba(212,176,90,0.1), transparent 48%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${accent}22`,
                color: accent,
                flexShrink: 0,
              }}
            >
              <Iconify icon={category.icon} width={22} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: CINEMA_SERIF,
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  color: CINEMA_CREAM,
                }}
              >
                {category.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(245,230,200,0.68)' }}>
                {category.tagline}
              </Typography>
            </Box>
          </Stack>

          <Button
            component={RouterLink}
            href={universeUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="contained"
            endIcon={<Iconify icon="solar:play-bold" />}
            sx={{
              flexShrink: 0,
              bgcolor: accent,
              color: '#1A1208',
              fontWeight: 800,
              '&:hover': { bgcolor: accent, opacity: 0.92 },
            }}
          >
            Enter Cinema Room
          </Button>
        </Stack>

        <CinemaReservationsTable
          category={category}
          customerId={viewerId}
          ownerCustomerId={catalogOwnerId || undefined}
          compact
          variant="banner"
        />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}>
            <CircularProgress sx={{ color: accent }} />
          </Stack>
        ) : (
          <CinemaFilmPosterCarousel
            title="Scheduled films"
            accent={accent}
            films={scheduledFilms}
            showRibbon={false}
            emptyMessage="No scheduled screenings yet. Admins can add showtimes in Admin → Media → Cinema."
            renderActions={(film) => {
              const screening = getNextFilmScreening(film);
              const alreadyReserved = screening ? reservedScreeningIds.has(screening.id) : false;
              const isReserving =
                seatMapMode === 'select' &&
                reservingFilm?.id === film.id &&
                (seatMapOpen || confirming);

              return (
                <IconButton
                  size="small"
                  disabled={!screening || confirming}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenSeatMap(film);
                  }}
                  sx={{
                    bgcolor: alreadyReserved ? 'rgba(76,175,80,0.9)' : 'rgba(18,12,8,0.88)',
                    color: alreadyReserved ? '#fff' : accent,
                    border: `1px solid ${accent}66`,
                    '&:hover': {
                      bgcolor: alreadyReserved ? 'rgba(76,175,80,0.95)' : 'rgba(30,20,12,0.95)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: alreadyReserved ? 'rgba(76,175,80,0.9)' : 'rgba(18,12,8,0.55)',
                      color: alreadyReserved ? '#fff' : 'rgba(245,230,200,0.35)',
                    },
                  }}
                  aria-label={
                    alreadyReserved
                      ? `View reservation for ${film.title}`
                      : `Reserve ${film.title}`
                  }
                >
                  {isReserving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify
                      icon={alreadyReserved ? 'solar:check-circle-bold' : 'solar:bookmark-bold'}
                      width={18}
                    />
                  )}
                </IconButton>
              );
            }}
          />
        )}
      </Stack>

      <CinemaSeatMapDialog
        open={seatMapOpen}
        session={seatSession}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={seatMapMode === 'select' ? handleToggleSeat : undefined}
        onClose={handleCloseSeatMap}
        onConfirm={seatMapMode === 'select' ? handleConfirmReserve : undefined}
        confirmLabel="Confirm reservation"
        confirmIcon="solar:bookmark-bold"
        confirming={confirming}
        readOnly={seatMapMode === 'view'}
        title={
          seatMapMode === 'view'
            ? viewingReservation
              ? `Reserved · ${viewingReservation.filmTitle}`
              : 'Your reservation'
            : undefined
        }
      />
    </Box>
  );
}

export function CinemaHubView() {
  const { user } = useAuthContext();
  const viewerId = String(user?.id || '');
  const classicCategory = CINEMA_CATEGORIES[0];

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

      <Stack spacing={3.5}>
        <Box sx={{ ...cinemaPageShellSx, p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 50% 18%, rgba(212,176,90,0.12), transparent 48%)',
              pointerEvents: 'none',
            }}
          />

          <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
            <CinemaTheaterIntro category={classicCategory} height={{ xs: 320, md: 500 }} />

            <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center', px: 2 }}>
              <Typography
                sx={{
                  fontFamily: CINEMA_SERIF,
                  fontWeight: 700,
                  fontSize: { xs: '1.35rem', md: '1.7rem' },
                  color: CINEMA_CREAM,
                }}
              >
                Cinema rooms
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(245,230,200,0.72)', maxWidth: 560 }}>
                Reserve scheduled films, then open the cinema room when you are ready to watch.
                Film catalog and showtimes are managed in Admin → Media → Cinema.
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={3}>
          {CINEMA_CATEGORIES.map((category) => (
            <CinemaCategoryRoom key={category.id} category={category} viewerId={viewerId} />
          ))}
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
