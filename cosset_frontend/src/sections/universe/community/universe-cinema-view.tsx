'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';
import type { CinemaChatParticipant } from 'src/types/cinema-chat';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import {
  createCinemaReservation,
  useGetCinemaReservations,
  updateCinemaReservationSeats,  
} from 'src/actions/cinema-film-reservation';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { leaveCinemaPresence } from 'src/actions/cinema-chat';

import { Player } from 'src/components/universe/player';
import { Iconify } from 'src/components/universe/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { toast } from 'src/components/dashboard/snackbar';
import {
  isCinemaCategory,
  getCinemaCategory,
  type CinemaCategory,
} from 'src/sections/dashboard/cinema/cinema-categories';
import { CINEMA_GOLD, CINEMA_SERIF } from 'src/sections/dashboard/cinema/cinema-theater-theme';
import {
  getDefaultScreening,
  getNextFilmScreening,
  getScreeningShowStatus,
  formatScreeningSchedule,
  getCinemaFilmShowStatusLabel,  
} from 'src/sections/dashboard/cinema/cinema-film-schedule';
import { formatCinemaSeatLabels } from 'src/sections/dashboard/cinema/cinema-seat-map';
import { CinemaSeatMapDialog } from 'src/sections/dashboard/cinema/cinema-seat-map-dialog';
import { CinemaRibbonTitle } from 'src/sections/dashboard/cinema/cinema-ribbon-title';
import { CinemaTheaterIntro } from 'src/sections/dashboard/cinema/cinema-theater-intro';
import { UniverseCinemaChat } from 'src/sections/universe/community/universe-cinema-chat';
import { UniverseCinemaParticipants } from 'src/sections/universe/community/universe-cinema-participants';

// ----------------------------------------------------------------------

function mergeParticipant(
  list: CinemaChatParticipant[],
  next: CinemaChatParticipant,
): CinemaChatParticipant[] {
  const key = next.userId.trim().toLowerCase();
  const index = list.findIndex((p) => p.userId.trim().toLowerCase() === key);
  if (index < 0) {
    return [...list, next];
  }

  const existing = list[index];
  const photoURL = next.photoURL || existing.photoURL;
  const updated = { ...existing, ...next, photoURL };
  if (!next.leftAt) {
    delete (updated as CinemaChatParticipant & { leftAt?: string }).leftAt;
  }
  return list.map((p, i) => (i === index ? updated : p));
}

function removeParticipant(list: CinemaChatParticipant[], userId: string): CinemaChatParticipant[] {
  const key = userId.trim().toLowerCase();
  return list.filter((p) => p.userId.trim().toLowerCase() !== key);
}

// ----------------------------------------------------------------------

type Props = {
  categoryId: string;
  ownerId?: string;
  initialFilmId?: number;
};

const CATEGORY_TAGS: Record<CinemaCategory, string> = {
  classic: 'Romance • Timeless',
  genre: 'Thrill • Suspense',
  drama: 'Drama • Heartfelt',
};

async function resolveMediaUrl(mediaUrl?: string | null) {
  const normalized = (mediaUrl || '').trim();
  if (!normalized) return '';
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/') ||
    normalized.startsWith('blob:')
  ) {
    return normalized;
  }
  return (await getS3SignedUrl(normalized)) || normalized;
}

function isStreamEmbedUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(url);
}

function hasReservationSeat(reservation?: ICinemaFilmReservationWithScreening | null) {
  return Boolean(reservation?.seatIds?.length);
}

function getFilmDisplayScore(film: ICinemaFilm) {
  const score = 8.2 + ((film.id * 17) % 12) / 10;
  return score.toFixed(1);
}

function getFilmTags(film: ICinemaFilm, categoryId: CinemaCategory) {
  if (film.director?.trim()) {
    const mood = CATEGORY_TAGS[categoryId].split(' • ')[0];
    return `${film.director.trim()} • ${mood}`;
  }

  return CATEGORY_TAGS[categoryId];
}

function isSameCalendarDay(value: string | Date | null | undefined, compare = new Date()) {
  if (value === null || value === undefined || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function CinemaFilmPosterCard({
  film,
  accent,
  categoryId,
  selected,
  isReserved,
  onSelect,
  onReserveSeat,
}: {
  film: ICinemaFilm;
  accent: string;
  categoryId: CinemaCategory;
  selected: boolean;
  isReserved?: boolean;
  onSelect: () => void;
  onReserveSeat?: () => void;
}) {
  const [posterUrl, setPosterUrl] = useState('');
  const displayScore = getFilmDisplayScore(film);
  const tags = getFilmTags(film, categoryId);
  const nextScreening = getNextFilmScreening(film);
  const showStatus = nextScreening ? getScreeningShowStatus(nextScreening) : 'unscheduled';
  const scheduleLabel = nextScreening ? formatScreeningSchedule(nextScreening) : null;
  const isToday = nextScreening ? isSameCalendarDay(nextScreening.showAt) : false;
  const statusLabel = isToday
    ? showStatus === 'now'
      ? 'Today · Now'
      : showStatus === 'past'
        ? 'Today · Ended'
        : 'Today'
    : getCinemaFilmShowStatusLabel(showStatus);

  useEffect(() => {
    let mounted = true;
    resolveMediaUrl(film.posterImage).then((url) => {
      if (mounted) setPosterUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [film.posterImage]);

  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      sx={{
        width: { xs: 136, sm: 146, md: 154 },
        flexShrink: 0,
        p: 0,
        border: 'none',
        bgcolor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        scrollSnapAlign: 'start',
        transition: (theme) =>
          theme.transitions.create(['transform', 'opacity', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
        transform: selected ? 'translateY(-4px)' : 'none',
        opacity: selected ? 1 : 0.88,
        '&:hover': { opacity: 1, transform: selected ? 'translateY(-4px)' : 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1.5,
          overflow: 'hidden',
          border: selected
            ? `2px solid ${accent}`
            : isReserved
              ? `1px solid rgba(76,175,80,0.85)`
              : isToday
                ? `1px solid ${accent}88`
                : `1px solid ${accent}2e`,
          bgcolor: selected ? 'rgba(28,20,10,0.98)' : 'rgba(10,7,5,0.88)',
          boxShadow: selected
            ? `0 14px 32px rgba(0,0,0,0.55), 0 0 0 1px ${accent}66, inset 0 0 0 1px ${accent}33`
            : isReserved
              ? '0 12px 28px rgba(0,0,0,0.42), 0 0 0 1px rgba(76,175,80,0.35)'
              : isToday
                ? `0 12px 28px rgba(0,0,0,0.42), 0 0 0 1px ${accent}33`
                : '0 12px 28px rgba(0,0,0,0.42)',
        }}
      >
        <Box sx={{ position: 'relative', pt: '118%', bgcolor: '#17110D', flexShrink: 0 }}>
          {posterUrl ? (
            <Box
              component="img"
              src={posterUrl}
              alt={film.title}
              sx={{
                position: 'absolute',
                inset: 0,
                width: 1,
                height: 1,
                objectFit: 'cover',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ position: 'absolute', inset: 0, color: 'rgba(255,255,255,0.35)' }}
            >
              <Iconify icon="solar:clapperboard-play-bold" width={30} />
            </Stack>
          )}

          {selected ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                boxShadow: `inset 0 0 0 1px ${accent}55`,
                background: `linear-gradient(180deg, ${accent}14 0%, transparent 28%, transparent 72%, ${accent}18 100%)`,
              }}
            />
          ) : null}

          {statusLabel ? (
            <Chip
              size="small"
              label={statusLabel}
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 1,
                height: 22,
                fontWeight: 700,
                fontSize: '0.65rem',
                bgcolor: isToday
                  ? showStatus === 'now'
                    ? 'rgba(46,125,50,0.92)'
                    : 'rgba(25,118,210,0.9)'
                  : 'rgba(0,0,0,0.72)',
                color: '#FFF8E7',
                border: `1px solid ${accent}66`,
              }}
            />
          ) : null}

          {isReserved ? (
            <Box
              component="button"
              type="button"
              aria-label="Choose seat"
              title="Choose seat"
              onClick={(event) => {
                event.stopPropagation();
                onReserveSeat?.();
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(46,125,50,0.92)',
                border: '1px solid rgba(129,199,132,0.7)',
                color: '#FFF8E7',
                cursor: 'pointer',
                p: 0,
                '&:hover': {
                  bgcolor: 'rgba(56,142,60,0.98)',
                },
              }}
            >
              <Iconify icon="solar:bookmark-bold" width={14} />
            </Box>
          ) : null}

          {scheduleLabel ? (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                px: 0.9,
                pt: 2.5,
                pb: 0.85,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 72%)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: isToday || isReserved ? accent : '#F5E6C8',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  fontSize: '0.62rem',
                }}
              >
                {scheduleLabel}
              </Typography>
            </Box>
          ) : null}
        </Box>

        <Stack
          spacing={0.4}
          sx={{
            px: 1.15,
            pt: 0.9,
            pb: 1,
            flexGrow: 1,
            bgcolor: selected ? `${accent}12` : 'transparent',
            borderTop: selected ? `1px solid ${accent}44` : '1px solid transparent',
          }}
        >
          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              fontWeight: 600,
              fontSize: '0.88rem',
              color: selected ? accent : '#F3E4C4',
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.2em',
            }}
          >
            {film.title}
          </Typography>

          <Stack direction="row" spacing={0.45} alignItems="center">
            <Iconify icon="solar:star-bold" width={13} sx={{ color: accent }} />
            <Typography variant="caption" sx={{ color: accent, fontWeight: 700 }}>
              {displayScore}
            </Typography>
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: selected ? 'rgba(245, 230, 200, 0.78)' : 'rgba(245, 230, 200, 0.55)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {tags}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

export function UniverseCinemaView({ categoryId, ownerId, initialFilmId }: Props) {
  const router = useRouter();
  const { user, authenticated } = useAuthContext();
  const [participants, setParticipants] = useState<CinemaChatParticipant[]>([]);
  const category = getCinemaCategory(categoryId);
  const resolvedCategory = category && isCinemaCategory(categoryId) ? category.id : null;
  const canFetch = Boolean(resolvedCategory);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { films, filmsLoading } = useGetCinemaFilms(
    canFetch ? null : undefined,
    canFetch ? resolvedCategory : null,
    { publicOnly: true },
  );

  const { screenings, screeningsLoading } = useGetCinemaScreenings(
    canFetch ? null : undefined,
    canFetch ? resolvedCategory : null,
    { publicOnly: true },
  );

  const catalogOwnerId = useMemo(() => {
    if (ownerId) return String(ownerId);
    const fromFilm = films.find((film) => film.customerId)?.customerId;
    return fromFilm ? String(fromFilm) : '';
  }, [films, ownerId]);

  const viewerCustomerId = String(user?.id || '');
  const { reservations, reservationsLoading } = useGetCinemaReservations(viewerCustomerId || null, {
    ...(catalogOwnerId ? { ownerCustomerId: catalogOwnerId } : {}),
    category: resolvedCategory,
    status: 'reserved',
  });

  const reservationsByScreeningId = useMemo(() => {
    const map = new Map<number, ICinemaFilmReservationWithScreening>();
    reservations.forEach((reservation) => {
      map.set(reservation.screeningId, reservation);
    });
    return map;
  }, [reservations]);

  const reservationsByFilmId = useMemo(() => {
    const map = new Map<number, ICinemaFilmReservationWithScreening>();
    reservations.forEach((reservation) => {
      if (!map.has(reservation.filmId)) {
        map.set(reservation.filmId, reservation);
      }
    });
    return map;
  }, [reservations]);

  const [activeFilmId, setActiveFilmId] = useState<number | null>(initialFilmId ?? null);
  const defaultScreening = useMemo(() => getDefaultScreening(screenings), [screenings]);

  const screeningFilms = useMemo(() => {
    const filmsById = new Map(films.map((film) => [film.id, film]));
    const screeningsByFilmId = screenings.reduce<Record<number, typeof screenings>>((acc, screening) => {
      const list = acc[screening.filmId] || [];
      list.push(screening);
      acc[screening.filmId] = list;
      return acc;
    }, {});

    const fromScreenings = Object.entries(screeningsByFilmId).flatMap(([filmId, filmScreenings]) => {
      const film = filmsById.get(Number(filmId));
      if (!film) return [];
      return [{ ...film, screenings: filmScreenings }];
    });

    if (fromScreenings.length) {
      return fromScreenings;
    }

    return films.flatMap((film) => {
      const nested = Array.isArray(film.screenings) ? film.screenings : [];
      return nested.length ? [{ ...film, screenings: nested }] : [];
    });
  }, [films, screenings]);

  const activeFilm = useMemo(() => {
    if (activeFilmId) {
      return screeningFilms.find((film) => film.id === activeFilmId) || null;
    }

    if (defaultScreening) {
      return (
        screeningFilms.find((film) => film.id === defaultScreening.filmId) ||
        screeningFilms[0] ||
        null
      );
    }

    return screeningFilms[0] || null;
  }, [activeFilmId, defaultScreening, screeningFilms]);

  const activeScreening = useMemo(() => {
    if (!activeFilm) return defaultScreening;
    return (
      screenings.find((screening) => screening.filmId === activeFilm.id) ||
      getNextFilmScreening(activeFilm) ||
      defaultScreening
    );
  }, [activeFilm, defaultScreening, screenings]);

  const loading = filmsLoading || screeningsLoading;
  const accent = category?.accent || CINEMA_GOLD;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapMode, setSeatMapMode] = useState<'select' | 'view'>('select');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [viewingReservation, setViewingReservation] =
    useState<ICinemaFilmReservationWithScreening | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isPresent = useMemo(() => {
    const uid = user?.id != null ? String(user.id).trim().toLowerCase() : '';
    if (!uid) return false;
    return participants.some(
      (p) => String(p.userId || '').trim().toLowerCase() === uid && !p.leftAt,
    );
  }, [participants, user?.id]);

  const handleParticipantsLoaded = useCallback(
    (loaded: CinemaChatParticipant[]) => {
      setParticipants((prev) => {
        let next = loaded.map((p) => {
          const existingPhoto = String(p.photoURL || '').trim();
          if (existingPhoto) return p;
          const authId = user?.id != null ? String(user.id).trim().toLowerCase() : '';
          if (authId && authId === p.userId.trim().toLowerCase()) {
            const authPhoto = String(user?.photoURL || '').trim();
            if (authPhoto) return { ...p, photoURL: authPhoto };
          }
          return p;
        });
        prev.forEach((p) => {
          next = mergeParticipant(next, p);
        });
        return next;
      });
    },
    [user?.id, user?.photoURL],
  );

  const handleParticipantJoin = useCallback(
    (participant: CinemaChatParticipant) => {
      let next = participant;
      if (!String(next.photoURL || '').trim()) {
        const authId = user?.id != null ? String(user.id).trim().toLowerCase() : '';
        if (authId && authId === next.userId.trim().toLowerCase()) {
          const authPhoto = String(user?.photoURL || '').trim();
          if (authPhoto) next = { ...next, photoURL: authPhoto };
        }
      }
      setParticipants((prev) => mergeParticipant(prev, next));
    },
    [user?.id, user?.photoURL],
  );

  const handleParticipantLeave = useCallback((userId: string) => {
    setParticipants((prev) => {
      const key = userId.trim().toLowerCase();
      return prev.map((p) =>
        p.userId.trim().toLowerCase() === key
          ? { ...p, leftAt: new Date().toISOString() }
          : p,
      );
    });
  }, []);

  const handleLeaveCinema = useCallback(async () => {
    if (authenticated && user?.id && catalogOwnerId && resolvedCategory) {
      const uid = String(user.id);
      setParticipants((prev) => removeParticipant(prev, uid));
      try {
        await leaveCinemaPresence(catalogOwnerId, resolvedCategory);
      } catch {
        // still navigate away
      }
    }
    router.push(paths.dashboard.community.cinema.root);
  }, [authenticated, catalogOwnerId, resolvedCategory, router, user?.id]);

  const activeReservation = useMemo(() => {
    if (!activeFilm) return null;

    if (activeScreening?.id) {
      const byScreening = reservationsByScreeningId.get(activeScreening.id);
      if (byScreening) return byScreening;
    }

    return reservationsByFilmId.get(activeFilm.id) || null;
  }, [activeFilm, activeScreening?.id, reservationsByFilmId, reservationsByScreeningId]);

  const headerSeatIds = useMemo(() => {
    if (selectedSeatIds.length) {
      return selectedSeatIds;
    }

    return activeReservation?.seatIds || [];
  }, [activeReservation?.seatIds, selectedSeatIds]);

  const headerSeatLabel = formatCinemaSeatLabels(headerSeatIds);

  const useEmbedPlayer = Boolean(resolvedVideoUrl && isStreamEmbedUrl(resolvedVideoUrl));

  const seatSession = useMemo(() => {
    if (seatMapMode === 'view' && viewingReservation) {
      return {
        cinemaName: 'Cosset Universe Cinema',
        sessionLabel:
          formatScreeningSchedule(viewingReservation) || 'Scheduled screening',
        roomLabel: category?.title || 'Cinema room',
      };
    }

    return {
      cinemaName: 'Cosset Universe Cinema',
      sessionLabel: activeScreening
        ? formatScreeningSchedule(activeScreening) || 'Scheduled screening'
        : 'Open screening',
      roomLabel: category?.title || 'Cinema room',
    };
  }, [activeScreening, category?.title, seatMapMode, viewingReservation]);

  useEffect(() => {
    let mounted = true;
    setIsPlaying(false);
    setResolvedVideoUrl('');
    setSelectedSeatIds([]);
    setSeatMapOpen(false);
    setSeatMapMode('select');
    setViewingReservation(null);

    const loadVideo = async () => {
      if (!activeFilm?.videoUrl) return;

      setVideoLoading(true);
      try {
        const url = await resolveMediaUrl(activeFilm.videoUrl);
        if (mounted) setResolvedVideoUrl(url);
      } finally {
        if (mounted) setVideoLoading(false);
      }
    };

    loadVideo();

    return () => {
      mounted = false;
    };
  }, [activeFilm?.id, activeFilm?.videoUrl]);

  useEffect(() => {
    if (
      !activeFilm?.videoUrl ||
      isPlaying ||
      filmsLoading ||
      screeningsLoading ||
      reservationsLoading
    ) {
      return;
    }

    if (headerSeatLabel) {
      return;
    }

    setSeatMapMode('select');
    setViewingReservation(activeReservation || null);
    setSelectedSeatIds([]);
    setSeatMapOpen(true);
  }, [
    activeFilm?.id,
    activeFilm?.videoUrl,
    activeReservation,
    filmsLoading,
    headerSeatLabel,
    isPlaying,
    reservationsLoading,
    screeningsLoading,
  ]);

  useEffect(() => {
    if (!isPlaying || useEmbedPlayer) return;
    const node = videoRef.current;
    if (!node || !resolvedVideoUrl) return;

    node.load();
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay may be blocked until user gesture — Watch now already is a gesture.
      });
    }
  }, [isPlaying, resolvedVideoUrl, useEmbedPlayer, activeFilm?.id]);

  const handleOpenSeatSelection = (
    reservation?: ICinemaFilmReservationWithScreening | null,
  ) => {
    if (!activeFilm?.videoUrl) return;

    setSeatMapMode('select');
    setViewingReservation(reservation || null);
    setSelectedSeatIds(
      reservation?.seatIds?.length ? [reservation.seatIds[0]] : [],
    );
    setSeatMapOpen(true);
  };

  const handleViewReservation = (reservation: ICinemaFilmReservationWithScreening) => {
    if (!hasReservationSeat(reservation)) {
      handleOpenSeatSelection(reservation);
      return;
    }

    setSeatMapMode('view');
    setViewingReservation(reservation);
    setSelectedSeatIds(reservation.seatIds || []);
    setSeatMapOpen(true);
  };

  const handleToggleSeat = (seatId: string) => {
    if (seatMapMode === 'view') return;
    setSelectedSeatIds((prev) => (prev.includes(seatId) ? [] : [seatId]));
  };

  const handleStartPlayback = async () => {
    const seatId = selectedSeatIds[0] || activeReservation?.seatIds?.[0];
    if (!activeFilm?.videoUrl || !seatId) return;

    if (viewerCustomerId && activeScreening?.id) {
      try {
        setConfirming(true);

        if (activeReservation) {
          await updateCinemaReservationSeats(
            activeReservation.id,
            { customerId: viewerCustomerId, seatIds: [seatId] },
            {
              ownerCustomerId: String(activeFilm.customerId || catalogOwnerId || '') || undefined,
              category: resolvedCategory || undefined,
            },
          );
        } else {
          await createCinemaReservation(
            {
              screeningId: activeScreening.id,
              customerId: viewerCustomerId,
              seatIds: [seatId],
            },
            {
              ownerCustomerId: String(activeFilm.customerId || catalogOwnerId || '') || undefined,
              category: resolvedCategory || undefined,
            },
          );
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message || error?.message || 'Failed to save seat.';
        toast.error(message);
        return;
      } finally {
        setConfirming(false);
      }
    }

    let url = resolvedVideoUrl;
    if (!url) {
      setVideoLoading(true);
      try {
        url = await resolveMediaUrl(activeFilm.videoUrl);
        setResolvedVideoUrl(url);
      } finally {
        setVideoLoading(false);
      }
    }

    if (!url) return;
    setSeatMapOpen(false);
    setSeatMapMode('select');
    setViewingReservation(null);
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    const node = videoRef.current;
    if (node) {
      node.pause();
      node.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSelectFilm = (filmId: number) => {
    if (filmId !== activeFilm?.id) {
      handleClosePlayer();
      setSelectedSeatIds([]);
      setSeatMapOpen(false);
      setSeatMapMode('select');
      setViewingReservation(null);
    }
    setActiveFilmId(filmId);
  };

  const handleCloseSeatMap = () => {
    if (confirming) return;

    setSeatMapOpen(false);
    setViewingReservation(null);
    if (seatMapMode === 'view') {
      setSeatMapMode('select');
    }
  };

  const scrollCarousel = (direction: 'prev' | 'next') => {
    const node = carouselRef.current;
    if (!node) return;
    const amount = Math.min(380, node.clientWidth * 0.72);
    node.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  if (!category || !resolvedCategory) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: '#F5E6C8',
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
            'radial-gradient(ellipse at 50% 18%, rgba(212,176,90,0.12), transparent 48%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.65), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          px: { xs: 2, md: 4 },
          py: { xs: 1.75, md: 2 },
          borderBottom: '1px solid rgba(212, 176, 90, 0.16)',
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          minHeight: { xs: 64, md: 72 },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ minWidth: 0, maxWidth: { xs: '38%', sm: '32%', md: '28%' }, zIndex: 1 }}
        >
          <Iconify icon={category.icon} width={22} sx={{ color: accent, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontFamily: CINEMA_SERIF,
                fontWeight: 700,
                fontSize: '1.05rem',
                lineHeight: 1.25,
                color: accent,
              }}
            >
              {category.title}
            </Typography>
            <Typography
              variant="overline"
              noWrap
              sx={{
                display: 'block',
                color: 'rgba(245,230,200,0.58)',
                letterSpacing: '0.18em',
                lineHeight: 1.2,
              }}
            >
              {category.tagline}
            </Typography>
          </Box>
        </Stack>

        <Typography
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '48%', sm: '52%', md: '56%' },
            textAlign: 'center',
            fontFamily: CINEMA_SERIF,
            color: accent,
            fontWeight: 700,
            fontSize: { xs: '0.85rem', sm: '1.15rem', md: '1.45rem' },
            letterSpacing: '0.06em',
            lineHeight: 1.15,
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          {category.headline}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            ml: 'auto',
            justifyContent: 'flex-end',
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <Button
            type="button"
            onClick={handleLeaveCinema}
            startIcon={<Iconify icon="solar:logout-2-outline" width={18} />}
            sx={{
              color: '#FFF8E7',
              bgcolor: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(212,176,90,0.28)',
              backdropFilter: 'blur(8px)',
              textTransform: 'none',
              fontWeight: 600,
              minWidth: { xs: 72, sm: 88 },
              px: { xs: 1, sm: 1.5 },
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
              '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
            }}
            disabled={authenticated ? !isPresent : false}
          >
            Exit
          </Button>
        </Stack>
      </Box>

      {canFetch && authenticated && resolvedCategory && catalogOwnerId ? (
        <>
          <UniverseCinemaParticipants participants={participants} />
          <UniverseCinemaChat
            ownerCustomerId={catalogOwnerId}
            category={resolvedCategory}
            participants={participants}
            onParticipantsLoaded={handleParticipantsLoaded}
            onParticipantJoin={handleParticipantJoin}
            onParticipantLeave={handleParticipantLeave}
            isPresent={isPresent}
          />
        </>
      ) : null}

      <Stack
        spacing={{ xs: 0.8, md: 1 }}
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
          {isPlaying && resolvedVideoUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: 1,
                borderRadius: { xs: 2, md: 3 },
                overflow: 'hidden',
                border: `1px solid ${accent}44`,
                boxShadow: `0 28px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset`,
                height: { xs: 300, md: 460 },
                bgcolor: '#000',
              }}
            >
              {useEmbedPlayer ? (
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <Player url={resolvedVideoUrl} playing controls width="100%" height="100%" />
                </Box>
              ) : (
                <Box
                  component="video"
                  ref={videoRef}
                  key={resolvedVideoUrl}
                  src={resolvedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: 1,
                    height: 1,
                    objectFit: 'contain',
                    bgcolor: '#000',
                  }}
                />
              )}

              <IconButton
                aria-label="Close player"
                onClick={handleClosePlayer}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 3,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: '#F5E6C8',
                  border: `1px solid ${accent}55`,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                }}
              >
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Box>
          ) : (
            <CinemaTheaterIntro
              category={category}
              height={{ xs: 300, md: 460 }}
              showTitles={false}
              showQuote={false}
              footer={
                loading || videoLoading ? (
                  <Stack alignItems="center">
                    <CircularProgress size={26} sx={{ color: accent }} />
                  </Stack>
                ) : activeFilm ? (
                  <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                    <Typography
                      sx={{
                        fontFamily: CINEMA_SERIF,
                        fontWeight: 700,
                        fontSize: { xs: '1.1rem', md: '1.45rem' },
                        color: '#FFF8E7',
                        textShadow: '0 3px 14px rgba(0,0,0,0.7)',
                      }}
                    >
                      {activeFilm.title}
                    </Typography>

                    {activeScreening && formatScreeningSchedule(activeScreening) ? (
                      <Typography variant="caption" sx={{ color: 'rgba(245,230,200,0.75)' }}>
                        {formatScreeningSchedule(activeScreening)}
                      </Typography>
                    ) : null}

                    {activeFilm.description ? (
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 560,
                          color: 'rgba(245,230,200,0.82)',
                          lineHeight: 1.7,
                          textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          px: 1,
                        }}
                      >
                        {activeFilm.description}
                      </Typography>
                    ) : null}

                    {activeFilm.videoUrl ? (
                      <Button
                        onClick={() => {
                          if (activeReservation?.seatIds?.[0]) {
                            handleStartPlayback();
                            return;
                          }

                          handleOpenSeatSelection(activeReservation);
                        }}
                        variant="contained"
                        endIcon={<Iconify icon="solar:play-bold" />}
                        sx={{
                          mt: 0.5,
                          bgcolor: accent,
                          color: '#1A1208',
                          fontWeight: 800,
                          px: 2.5,
                          '&:hover': { bgcolor: accent, opacity: 0.92 },
                        }}
                      >
                        {headerSeatLabel ? `Watch now · ${headerSeatLabel}` : 'Watch now'}
                      </Button>
                    ) : null}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(245,230,200,0.72)',
                      maxWidth: 420,
                      mx: 'auto',
                      textAlign: 'center',
                    }}
                  >
                    {category.description}
                  </Typography>
                )
              }
            />
          )}
        </Box>

        <Stack
          spacing={0}
          sx={{
            width: 'min(1120px, 100%)',
            mx: 'auto',
            mt: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: { xs: 0.5, sm: 0 },
              pr: { xs: 0.5, sm: 1 },
            }}
          >
            <CinemaRibbonTitle title="Film List" accent={accent} align="left" />

            {activeFilm ? (
              <Button
                size="small"
                onClick={() => {
                  if (activeReservation && hasReservationSeat(activeReservation)) {
                    handleViewReservation(activeReservation);
                    return;
                  }

                  handleOpenSeatSelection(activeReservation);
                }}
                startIcon={
                  <Iconify
                    icon={headerSeatLabel ? 'solar:bookmark-bold' : 'solar:ticket-bold'}
                    width={16}
                  />
                }
                sx={{
                  flexShrink: 0,
                  minWidth: 0,
                  maxWidth: { xs: 140, sm: 180 },
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: headerSeatLabel ? 'rgba(46,125,50,0.88)' : 'rgba(18,12,8,0.88)',
                  color: headerSeatLabel ? '#FFF8E7' : accent,
                  border: headerSeatLabel
                    ? '1px solid rgba(129,199,132,0.55)'
                    : `1px solid ${accent}66`,
                  fontWeight: 700,
                  fontSize: { xs: '0.68rem', sm: '0.75rem' },
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    bgcolor: headerSeatLabel ? 'rgba(56,142,60,0.96)' : 'rgba(30,20,12,0.95)',
                  },
                }}
              >
                <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      lineHeight: 1.1,
                      opacity: 0.82,
                      fontSize: '0.62rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Seat
                  </Typography>
                  <Typography
                    noWrap
                    sx={{
                      fontWeight: 800,
                      fontSize: 'inherit',
                      lineHeight: 1.2,
                    }}
                  >
                    {headerSeatLabel || 'No seat'}
                  </Typography>
                </Box>
              </Button>
            ) : null}
          </Box>

          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress sx={{ color: accent }} />
            </Stack>
          ) : screeningFilms.length ? (
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                border: `1px solid ${accent}28`,
                bgcolor: 'rgba(8,5,3,0.42)',
                px: { xs: 1, sm: 2 },
                py: { xs: 1.5, md: 1.75 },
                overflowY: 'visible',
              }}
            >
              <IconButton
                aria-label="Previous films"
                onClick={() => scrollCarousel('prev')}
                sx={{
                  position: 'absolute',
                  left: { xs: 2, md: -6 },
                  top: '42%',
                  zIndex: 2,
                  width: 42,
                  height: 42,
                  bgcolor: 'rgba(18,12,8,0.88)',
                  border: `1px solid ${accent}88`,
                  color: accent,
                  display: { xs: 'none', sm: 'inline-flex' },
                  boxShadow: `0 0 16px ${accent}33`,
                  '&:hover': { bgcolor: 'rgba(30,20,12,0.96)', borderColor: accent },
                }}
              >
                <Iconify icon="eva:arrow-ios-back-fill" />
              </IconButton>

              <IconButton
                aria-label="Next films"
                onClick={() => scrollCarousel('next')}
                sx={{
                  position: 'absolute',
                  right: { xs: 2, md: -6 },
                  top: '42%',
                  zIndex: 2,
                  width: 42,
                  height: 42,
                  bgcolor: 'rgba(18,12,8,0.88)',
                  border: `1px solid ${accent}88`,
                  color: accent,
                  display: { xs: 'none', sm: 'inline-flex' },
                  boxShadow: `0 0 16px ${accent}33`,
                  '&:hover': { bgcolor: 'rgba(30,20,12,0.96)', borderColor: accent },
                }}
              >
                <Iconify icon="eva:arrow-ios-forward-fill" />
              </IconButton>

              <Stack
                ref={carouselRef}
                direction="row"
                spacing={2.25}
                sx={{
                  overflowX: 'auto',
                  overflowY: 'visible',
                  px: { xs: 0.5, sm: 4 },
                  py: 1.25,
                  scrollSnapType: 'x mandatory',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {screeningFilms.map((film) => {
                  const nextScreening = getNextFilmScreening(film);
                  const reservation =
                    (nextScreening && reservationsByScreeningId.get(nextScreening.id)) ||
                    reservationsByFilmId.get(film.id) ||
                    null;
                  const isReserved = Boolean(reservation);

                  return (
                    <CinemaFilmPosterCard
                      key={film.id}
                      film={film}
                      accent={accent}
                      categoryId={resolvedCategory}
                      selected={activeFilm?.id === film.id}
                      isReserved={isReserved}
                      onSelect={() => handleSelectFilm(film.id)}
                      onReserveSeat={
                        reservation
                          ? () => {
                              handleSelectFilm(film.id);
                              handleOpenSeatSelection(reservation);
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </Stack>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: 'rgba(245,230,200,0.68)', textAlign: 'center', py: 4, lineHeight: 1.8 }}
            >
              No screening films in this room yet.
            </Typography>
          )}
        </Stack>
      </Stack>

      <CinemaSeatMapDialog
        open={seatMapOpen}
        session={seatSession}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={seatMapMode === 'select' ? handleToggleSeat : undefined}
        onClose={handleCloseSeatMap}
        onConfirm={seatMapMode === 'select' ? handleStartPlayback : undefined}
        confirmLabel={activeReservation ? 'Confirm seat & watch' : 'Confirm & watch'}
        confirmIcon={activeReservation ? 'solar:bookmark-bold' : 'solar:play-bold'}
        confirming={confirming}
        readOnly={seatMapMode === 'view'}
        title={
          seatMapMode === 'view'
            ? viewingReservation
              ? `Reserved · ${viewingReservation.filmTitle}`
              : 'Your reservation'
            : activeReservation && !hasReservationSeat(activeReservation)
              ? `Choose seat · ${activeFilm?.title || 'Screening'}`
              : undefined
        }
      />
    </Box>
  );
}
