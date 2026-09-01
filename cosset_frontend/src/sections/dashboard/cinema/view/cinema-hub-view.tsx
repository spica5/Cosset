'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';

import { useMemo, useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import {
  createCinemaReservation,
  useGetCinemaReservations,
} from 'src/actions/cinema-film-reservation';

import { CinemaFilmPosterCarousel } from '../cinema-film-poster-carousel';
import {
  CINEMA_CATEGORIES,
  cinemaShellSx,
  type CinemaCategory,
  type CinemaCategoryMeta,
} from '../cinema-categories';
import { CinemaNotificationSettings } from '../cinema-notification-settings';
import { CinemaReservationsTable, ReservationPosterThumb } from '../cinema-reservations-table';
import {
  formatScreeningSchedule,
  getNextFilmScreening,
  getNextScreeningStart,
  formatNearestScreeningTime,
  getScreeningShowStatus,
  getCinemaFilmShowStatusLabel,
  isFilmOnActiveSchedule,
  filterScreeningsForViewer,
} from '../cinema-film-schedule';
import { CinemaSeatMapDialog } from '../cinema-seat-map-dialog';
import { CinemaTheaterIntro } from '../cinema-theater-intro';
import { CINEMA_CREAM, CINEMA_GOLD, CINEMA_SERIF, cinemaPageShellSx } from '../cinema-theater-theme';

// ----------------------------------------------------------------------

function CinemaCategoryRoom({
  category,
  viewerId,
  isAdmin = false,
}: {
  category: CinemaCategoryMeta;
  viewerId: string;
  isAdmin?: boolean;
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
      const screeningId = Number(reservation.screeningId);
      if (Number.isFinite(screeningId)) {
        map.set(screeningId, reservation);
      }
    });
    return map;
  }, [reservations]);

  const reservationsByFilmId = useMemo(() => {
    const map = new Map<number, ICinemaFilmReservationWithScreening>();
    reservations.forEach((reservation) => {
      const filmId = Number(reservation.filmId);
      if (Number.isFinite(filmId) && !map.has(filmId)) {
        map.set(filmId, reservation);
      }
    });
    return map;
  }, [reservations]);

  const getReservationForFilm = useCallback(
    (film: ICinemaFilm, screening?: ReturnType<typeof getNextFilmScreening> | null) => {
      const screeningId = screening?.id != null ? Number(screening.id) : NaN;
      if (Number.isFinite(screeningId)) {
        const byScreening = reservationsByScreeningId.get(screeningId);
        if (byScreening) return byScreening;
      }

      const filmId = Number(film.id);
      return Number.isFinite(filmId) ? reservationsByFilmId.get(filmId) || null : null;
    },
    [reservationsByFilmId, reservationsByScreeningId],
  );

  const scheduledFilms = useMemo(() => {
    const getNewestTime = (value?: string | Date | null) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const screeningsByFilmId = screenings.reduce<Record<number, typeof screenings>>((acc, screening) => {
      const filmId = Number(screening.filmId);
      if (!Number.isFinite(filmId)) return acc;
      const list = acc[filmId] || [];
      list.push(screening);
      acc[filmId] = list;
      return acc;
    }, {});

    return films
      .flatMap((film) => {
        const filmId = Number(film.id);
        if (!Number.isFinite(filmId)) return [];
        const fromApi = screeningsByFilmId[filmId] || [];
        const nested = Array.isArray(film.screenings) ? film.screenings : [];
        // Once screenings have loaded, empty API results win over nested film.screenings
        // so schedule create/update/delete actually refreshes the list.
        const merged = filterScreeningsForViewer(
          screeningsLoading ? (fromApi.length ? fromApi : nested) : fromApi,
          { isAdmin },
        );

        return merged.length ? [{ ...film, id: filmId, screenings: merged }] : [];
      })
      .filter((film) => isFilmOnActiveSchedule(film, new Date(), null, { isAdmin }))
      .sort((a, b) => {
        const createdDiff = getNewestTime(b.createdAt) - getNewestTime(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return Number(b.id) - Number(a.id);
      });
  }, [films, isAdmin, screenings, screeningsLoading]);

  const featuredFilm = useMemo(() => {
    const now = new Date();

    const ranked = scheduledFilms
      .map((film) => {
        const screening = getNextFilmScreening(film, now);
        const status = screening ? getScreeningShowStatus(screening, now) : 'unscheduled';
        return { film, screening, status };
      })
      .filter((item) => item.status === 'now' || item.status === 'upcoming')
      .sort((a, b) => {
        const rank = (status: typeof a.status) => (status === 'now' ? 0 : 1);
        const rankDiff = rank(a.status) - rank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const aStart = a.screening ? getNextScreeningStart(a.screening, now)?.getTime() ?? 0 : 0;
        const bStart = b.screening ? getNextScreeningStart(b.screening, now)?.getTime() ?? 0 : 0;
        return aStart - bStart;
      });

    return ranked[0] || null;
  }, [scheduledFilms]);

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
      const existing = getReservationForFilm(film, screening);

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
    [getReservationForFilm],
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
        ...cinemaShellSx(category),
        p: { xs: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: category.overlay,
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: { md: 1 } }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: category.id === 'genre' ? '50%' : 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: `rgba(${category.accentRgb}, 0.16)`,
                color: accent,
                flexShrink: 0,
                boxShadow:
                  category.id === 'genre'
                    ? `0 0 0 1px rgba(${category.accentRgb}, 0.35), 0 0 24px rgba(${category.accentRgb}, 0.25)`
                    : `inset 0 0 0 1px rgba(${category.accentRgb}, 0.35)`,
              }}
            >
              <Iconify icon={category.icon} width={22} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: category.fontFamily,
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  letterSpacing: category.id === 'genre' ? '0.04em' : undefined,
                  color: category.textColor,
                }}
              >
                {category.title}
              </Typography>
              <Typography variant="body2" sx={{ color: category.mutedTextColor }}>
                {category.tagline}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {category.chips.map((chip) => (
                  <Box
                    key={chip}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: category.id === 'genre' ? 999 : 0.75,
                      typography: 'caption',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: accent,
                      border: `1px solid rgba(${category.accentRgb}, 0.4)`,
                      bgcolor: `rgba(${category.accentRgb}, 0.1)`,
                    }}
                  >
                    {chip}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent={{ xs: 'space-between', md: 'flex-end' }}
            sx={{ flexShrink: 0, minWidth: 0, width: { xs: 1, md: 'auto' } }}
          >
            {featuredFilm ? (
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{
                  minWidth: 0,
                  maxWidth: { xs: 1, sm: 320 },
                  flex: { xs: 1, md: 'none' },
                  px: 1.25,
                  py: 0.85,
                  borderRadius: 1.5,
                  border: `1px solid rgba(${category.accentRgb}, 0.35)`,
                  bgcolor: `rgba(${category.accentRgb}, 0.08)`,
                }}
              >
                <ReservationPosterThumb
                  posterImage={featuredFilm.film.posterImage}
                  title={featuredFilm.film.title}
                  accent={accent}
                  width={56}
                  height={80}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Chip
                    size="small"
                    label={getCinemaFilmShowStatusLabel(featuredFilm.status) || 'Scheduled'}
                    sx={{
                      height: 20,
                      mb: 0.5,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      bgcolor:
                        featuredFilm.status === 'now'
                          ? accent
                          : 'rgba(25,118,210,0.82)',
                      color: featuredFilm.status === 'now' ? '#1A1208' : CINEMA_CREAM,
                    }}
                  />
                  <Typography
                    noWrap
                    sx={{
                      fontFamily: CINEMA_SERIF,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: CINEMA_CREAM,
                      lineHeight: 1.25,
                    }}
                  >
                    {featuredFilm.film.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(245,230,200,0.68)', display: 'block' }}
                  >
                    {featuredFilm.film.year || category.shortTitle}
                  </Typography>
                  {featuredFilm.screening ? (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: 'rgba(245,230,200,0.78)',
                        display: 'block',
                        mt: 0.35,
                        lineHeight: 1.35,
                        fontWeight: 600,
                      }}
                    >
                      {formatNearestScreeningTime(
                        featuredFilm.screening,
                        new Date(),
                        featuredFilm.film.duration ?? null,
                      ) || 'Scheduled screening'}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            ) : (
              <Box sx={{ flex: 1 }} />
            )}

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
            layout="grid"
            showRibbon={false}
            description="Click the ticket icon on a poster to choose a seat and reserve that screening. Your reservation appears under Reserved screenings above — open Enter Cinema Room when you are ready to watch."
            emptyMessage="No scheduled screenings yet. Admins can add showtimes in Admin → Media → Cinema."
            renderActions={(film) => {
              const screening = getNextFilmScreening(film);
              const reservation = getReservationForFilm(film, screening);
              const alreadyReserved = Boolean(reservation);
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
                      icon={alreadyReserved ? 'solar:bookmark-bold' : 'solar:ticket-bold'}
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
  const isAdmin = isUserAdmin(user?.role);
  const classicCategory = CINEMA_CATEGORIES[0];
  const [activeCategoryId, setActiveCategoryId] = useState<CinemaCategory>(
    CINEMA_CATEGORIES[0]?.id || 'classic',
  );

  const activeCategory = useMemo(
    () => CINEMA_CATEGORIES.find((item) => item.id === activeCategoryId) || CINEMA_CATEGORIES[0],
    [activeCategoryId],
  );

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

      <Stack spacing={2} sx={{ mb: { xs: 2, md: 2.5 } }}>
        <CinemaNotificationSettings enabled={Boolean(viewerId)} />
      </Stack>

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
            <CinemaTheaterIntro
              category={classicCategory}
              height={{ xs: 340, md: 420 }}
              bannerImage={`${CONFIG.dashboard.assetsDir}/assets/images/cinema/banner/intro.png`}
              showEyebrow={false}
              showQuote={false}
              headline="Movies That Stay With You."
              subtitle="We watch not to escape life, but for life not to escape us."
              footer={
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: CINEMA_SERIF,
                      fontWeight: 700,
                      fontSize: { xs: '1.15rem', md: '1.45rem' },
                      color: CINEMA_CREAM,
                      textShadow: '0 2px 12px rgba(0,0,0,0.65)',
                    }}
                  >
                    Cinema rooms
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(245,230,200,0.82)',
                      maxWidth: 560,
                      fontSize: { xs: '0.78rem', md: '0.875rem' },
                      textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    Two cinema halls: Emotion & Adventure (action, adventure, comedy, drama,
                    romance, animation), and Mystery & Fantasy (horror, thriller, mystery, crime,
                    sci-fi, fantasy). Reserve a screening, then enter the room when you are ready.
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </Box>

        <Stack spacing={2}>
          <Stack spacing={1.5} sx={{ width: 1 }}>
            <Typography
              sx={{
                fontFamily: CINEMA_SERIF,
                fontWeight: 700,
                fontSize: { xs: '0.78rem', sm: '0.88rem' },
                color: CINEMA_GOLD,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Choose Your Cinema Room
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: { xs: 1.25, sm: 1.5 },
                width: 1,
              }}
            >
              {CINEMA_CATEGORIES.map((item) => {
                const selected = item.id === activeCategoryId;
                const tabIcon =
                  item.id === 'genre' ? 'solar:stars-bold' : 'solar:videocamera-record-bold';
                const accent = selected ? item.accent : 'rgba(170,170,170,0.72)';
                const muted = selected ? 'rgba(245,230,200,0.78)' : 'rgba(170,170,170,0.62)';

                return (
                  <Button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveCategoryId(item.id)}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: { xs: 1.5, sm: 2 },
                      width: 1,
                      minHeight: { xs: 84, sm: 96 },
                      height: 'auto',
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.75, sm: 2 },
                      borderRadius: { xs: 2, md: 3 },
                      textTransform: 'none',
                      textAlign: 'left',
                      color: accent,
                      bgcolor: selected ? 'rgba(18,14,10,0.92)' : 'rgba(12,12,12,0.72)',
                      border: selected
                        ? `1px solid ${item.accent}`
                        : '1px solid rgba(140,140,140,0.35)',
                      boxShadow: selected
                        ? `0 0 0 1px rgba(${item.accentRgb}, 0.18), 0 0 28px rgba(${item.accentRgb}, 0.22), inset 0 0 40px rgba(${item.accentRgb}, 0.08)`
                        : 'none',
                      overflow: 'hidden',
                      '&:hover': {
                        bgcolor: selected ? 'rgba(22,16,10,0.96)' : 'rgba(20,20,20,0.85)',
                        borderColor: selected ? item.accent : 'rgba(170,170,170,0.5)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 44, sm: 52 },
                        height: { xs: 44, sm: 52 },
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: accent,
                        border: `1.5px solid ${
                          selected ? `rgba(${item.accentRgb}, 0.85)` : 'rgba(140,140,140,0.45)'
                        }`,
                        bgcolor: selected
                          ? `rgba(${item.accentRgb}, 0.1)`
                          : 'rgba(255,255,255,0.03)',
                        boxShadow: selected
                          ? `0 0 16px rgba(${item.accentRgb}, 0.25)`
                          : 'none',
                      }}
                    >
                      <Iconify icon={tabIcon} width={22} />
                    </Box>

                    <Stack spacing={0.35} alignItems="flex-start" sx={{ minWidth: 0, flex: 1, pb: 0.75 }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '0.78rem', sm: '0.95rem', md: '1.05rem' },
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: accent,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          color: muted,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.tabSubtitle}
                      </Typography>
                    </Stack>

                    {selected ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          bottom: 10,
                          transform: 'translateX(-50%)',
                          width: 56,
                          height: 3,
                          borderRadius: 999,
                          bgcolor: item.accent,
                          boxShadow: `0 0 10px rgba(${item.accentRgb}, 0.8)`,
                        }}
                      />
                    ) : null}
                  </Button>
                );
              })}
            </Box>
          </Stack>

          {activeCategory ? (
            <CinemaCategoryRoom
              key={activeCategory.id}
              category={activeCategory}
              viewerId={viewerId}
              isAdmin={isAdmin}
            />
          ) : null}
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
