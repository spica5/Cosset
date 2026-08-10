'use client';

import type ReactPlayer from 'react-player';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { CinemaChatParticipant } from 'src/types/cinema-chat';
import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';
import { formatStr, fTime, fDateTimeFromUtc } from 'src/utils/format-time';

import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { leaveCinemaPresence } from 'src/actions/cinema-chat';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import {
  createCinemaReservation,
  useGetCinemaReservations,
  updateCinemaReservationSeats,  
} from 'src/actions/cinema-film-reservation';

import { Player } from 'src/components/universe/player';
import { Iconify } from 'src/components/universe/iconify';
import { toast } from 'src/components/dashboard/snackbar';

import { CinemaRibbonTitle } from 'src/sections/dashboard/cinema/cinema-ribbon-title';
import { formatCinemaSeatLabels } from 'src/sections/dashboard/cinema/cinema-seat-map';
import { CinemaTheaterIntro } from 'src/sections/dashboard/cinema/cinema-theater-intro';
import { UniverseCinemaChat } from 'src/sections/universe/community/universe-cinema-chat';
import { CinemaSeatMapDialog } from 'src/sections/dashboard/cinema/cinema-seat-map-dialog';
import { CINEMA_GOLD, CINEMA_SERIF } from 'src/sections/dashboard/cinema/cinema-theater-theme';
import { UniverseCinemaParticipants } from 'src/sections/universe/community/universe-cinema-participants';
import {
  getCinemaCategory,
  CINEMA_CATEGORIES,
  resolveCinemaCategoryId,
  type CinemaCategory,
} from 'src/sections/dashboard/cinema/cinema-categories';
import {
  getDefaultScreening,
  getNextFilmScreening,
  isFixedTimeScreening,
  isScreeningDayToday,
  getNextScreeningStart,
  getScreeningShowStatus,
  formatScreeningSchedule,
  getSyncedPlaybackSeconds,
  probeVideoDurationSeconds,
  getCinemaFilmShowStatusLabel,
  getScreeningScheduleLabels,
} from 'src/sections/dashboard/cinema/cinema-film-schedule';

import { useAuthContext } from 'src/auth/hooks';

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
  classic: 'Action • Adventure • Comedy • Drama • Romance • Animation',
  genre: 'Horror • Thriller • Mystery • Crime • Sci-Fi • Fantasy',
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

type CinemaViewerPlan = 'FREE' | 'PAID' | 'EXTRA-PAID';
type ScreeningAccessState = 'scheduled-live' | 'off-schedule';

type ScreeningPaymentQuote = {
  screeningId: number;
  filmTitle: string;
  plan: CinemaViewerPlan;
  accessState: ScreeningAccessState;
  baseFee: number;
  charge: number;
};

function normalizeViewerPlan(value: unknown): CinemaViewerPlan {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '-');
  if (normalized === 'PAID' || normalized === 'EXTRA-PAID') {
    return normalized;
  }
  return 'FREE';
}

function parseScreeningFee(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatCinemaMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)));
}

/** Compact countdown until a future instant, e.g. `2h 15m 30s`. */
function formatRemainingUntil(target: Date, now = new Date()) {
  const remainingMs = target.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return 'now';
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
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

function CinemaFilmPosterCard({
  film,
  accent,
  categoryId,
  selected,
  isReserved,
  mediaDurationSeconds,
  scheduleNow,
  onSelect,
  onReserveSeat,
}: {
  film: ICinemaFilm;
  accent: string;
  categoryId: CinemaCategory;
  selected: boolean;
  isReserved?: boolean;
  mediaDurationSeconds?: number | null;
  scheduleNow?: Date;
  onSelect: () => void;
  onReserveSeat?: () => void;
}) {
  const [posterUrl, setPosterUrl] = useState('');
  const displayScore = getFilmDisplayScore(film);
  const tags = getFilmTags(film, categoryId);
  const now = scheduleNow || new Date();
  const nextScreening = getNextFilmScreening(film, now, mediaDurationSeconds);
  const showStatus = nextScreening
    ? getScreeningShowStatus(nextScreening, now, mediaDurationSeconds)
    : 'unscheduled';
  const scheduleLabels = nextScreening ? getScreeningScheduleLabels(nextScreening, now) : [];
  const isToday = nextScreening ? isScreeningDayToday(nextScreening, now) : false;
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <Box
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      sx={{
        width: { xs: 136, sm: 146, md: 154 },
        flexShrink: 0,
        p: 0,
        border: 'none',
        bgcolor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        outline: 'none',
        scrollSnapAlign: 'start',
        transition: (theme) =>
          theme.transitions.create(['transform', 'opacity', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
        transform: selected ? 'translateY(-4px)' : 'none',
        opacity: selected ? 1 : 0.88,
        '&:hover': { opacity: 1, transform: selected ? 'translateY(-4px)' : 'translateY(-2px)' },
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${accent}88`,
          borderRadius: 2,
        },
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

          {scheduleLabels.length ? (
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
              <Stack spacing={0.1}>
                {scheduleLabels.map((label) => (
                  <Typography
                    key={label}
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: isToday || isReserved ? accent : '#F5E6C8',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      fontSize: '0.62rem',
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Stack>
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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeCategoryId, setActiveCategoryId] = useState<CinemaCategory>(
    () => resolveCinemaCategoryId(categoryId) || 'classic',
  );

  useEffect(() => {
    const nextCategory = resolveCinemaCategoryId(categoryId);
    if (nextCategory && nextCategory !== activeCategoryId) {
      setActiveCategoryId(nextCategory);
    }
    // Only sync when the route category changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const category = getCinemaCategory(activeCategoryId);
  const resolvedCategory = category?.id ?? null;
  const canFetch = Boolean(resolvedCategory);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

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
  // Load all of this viewer's reserved seats for the category (don't filter by owner —
  // community rooms can mix owners and a strict owner filter hid existing reservations,
  // causing duplicate create → 409).
  const { reservations, reservationsLoading } = useGetCinemaReservations(viewerCustomerId || null, {
    category: resolvedCategory,
    status: 'reserved',
  });

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

  const [activeFilmId, setActiveFilmId] = useState<number | null>(initialFilmId ?? null);
  const [filmDurationById, setFilmDurationById] = useState<Record<number, number>>({});
  const defaultScreening = useMemo(
    () => getDefaultScreening(screenings, new Date(nowMs), filmDurationById),
    [filmDurationById, nowMs, screenings],
  );

  const screeningFilms = useMemo(() => {
    const getNewestTime = (value?: string | Date | null) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const sortNewestFirst = <T extends { id: number; createdAt?: string | Date | null; order?: number | null }>(
      list: T[],
    ) =>
      [...list].sort((a, b) => {
        const createdDiff = getNewestTime(b.createdAt) - getNewestTime(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return Number(b.id) - Number(a.id);
      });

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
      return sortNewestFirst(fromScreenings);
    }

    return sortNewestFirst(
      films.flatMap((film) => {
        const nested = Array.isArray(film.screenings) ? film.screenings : [];
        return nested.length ? [{ ...film, screenings: nested }] : [];
      }),
    );
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

    const duration = filmDurationById[activeFilm.id] ?? null;
    // Prefer the screening that is live or next up (supports showAt + showAt2).
    return getNextFilmScreening(activeFilm, new Date(nowMs), duration) || defaultScreening;
  }, [activeFilm, defaultScreening, filmDurationById, nowMs]);

  const loading = filmsLoading || screeningsLoading;
  const accent = category?.accent || CINEMA_GOLD;
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedPlayerRef = useRef<ReactPlayer | null>(null);
  const syncingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapMode, setSeatMapMode] = useState<'select' | 'view'>('select');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [viewingReservation, setViewingReservation] =
    useState<ICinemaFilmReservationWithScreening | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState<ScreeningPaymentQuote | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [screeningUnlocked, setScreeningUnlocked] = useState(false);

  useEffect(() => {
    const stored: Record<number, number> = {};

    screeningFilms.forEach((film) => {
      if (typeof film.duration === 'number' && Number.isFinite(film.duration) && film.duration > 0) {
        stored[film.id] = film.duration;
      }
    });

    if (!Object.keys(stored).length) {
      return;
    }

    setFilmDurationById((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(stored).forEach(([id, duration]) => {
        const filmId = Number(id);
        if (next[filmId] !== duration) {
          next[filmId] = duration;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [screeningFilms]);

  useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      const pending = screeningFilms.filter(
        (film) =>
          film.videoUrl &&
          !(typeof film.duration === 'number' && film.duration > 0) &&
          filmDurationById[film.id] == null,
      );
      if (!pending.length) return;

      await Promise.all(
        pending.map(async (film) => {
          try {
            const url = await resolveMediaUrl(film.videoUrl);
            if (!url || cancelled) return;
            const duration = await probeVideoDurationSeconds(url);
            if (cancelled || duration == null) return;
            setFilmDurationById((prev) =>
              prev[film.id] == null ? { ...prev, [film.id]: duration } : prev,
            );
          } catch {
            // Keep fallback window when duration cannot be probed.
          }
        }),
      );
    };

    loadDurations();

    return () => {
      cancelled = true;
    };
  }, [filmDurationById, screeningFilms]);

  const viewerPlan = normalizeViewerPlan(user?.plan);
  const isPaidViewer = viewerPlan !== 'FREE';

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

    if (activeScreening?.id != null) {
      const screeningId = Number(activeScreening.id);
      if (Number.isFinite(screeningId)) {
        const byScreening = reservationsByScreeningId.get(screeningId);
        if (byScreening) return byScreening;
      }
    }

    const filmId = Number(activeFilm.id);
    return Number.isFinite(filmId) ? reservationsByFilmId.get(filmId) || null : null;
  }, [activeFilm, activeScreening?.id, reservationsByFilmId, reservationsByScreeningId]);

  const headerSeatIds = useMemo(() => {
    if (selectedSeatIds.length) {
      return selectedSeatIds;
    }

    return activeReservation?.seatIds || [];
  }, [activeReservation?.seatIds, selectedSeatIds]);

  const headerSeatLabel = formatCinemaSeatLabels(headerSeatIds);

  const useEmbedPlayer = Boolean(resolvedVideoUrl && isStreamEmbedUrl(resolvedVideoUrl));
  const isSyncedScreening = isFixedTimeScreening(activeScreening);
  const scheduleNow = useMemo(() => new Date(nowMs), [nowMs]);
  const activeMediaDurationSeconds =
    (activeFilm?.id != null ? filmDurationById[activeFilm.id] : null) ?? null;
  const activeShowStatus = activeScreening
    ? getScreeningShowStatus(activeScreening, scheduleNow, activeMediaDurationSeconds)
    : 'unscheduled';
  const activeScreeningFee = activeScreening ? parseScreeningFee(activeScreening.price) : 0;
  const isComplimentaryLiveAccess = isPaidViewer && activeShowStatus === 'now';
  const requiresPayment =
    activeScreeningFee > 0 && !screeningUnlocked && !isComplimentaryLiveAccess;
  const isLiveScheduledScreening = isSyncedScreening && activeShowStatus === 'now';
  const activeNextStart =
    activeScreening && activeShowStatus === 'upcoming'
      ? getNextScreeningStart(activeScreening, scheduleNow)
      : null;
  const activeRemainingLabel = activeNextStart
    ? formatRemainingUntil(activeNextStart, scheduleNow)
    : null;
  const activeScheduleLabels = activeScreening
    ? getScreeningScheduleLabels(activeScreening, scheduleNow)
    : [];

  const syncNativePlayback = useCallback(() => {
    if (!isLiveScheduledScreening || !activeScreening || useEmbedPlayer) {
      return false;
    }

    const node = videoRef.current;
    if (!node) {
      return false;
    }

    const mediaDuration =
      Number.isFinite(node.duration) && node.duration > 0
        ? node.duration
        : activeMediaDurationSeconds;

    const target = getSyncedPlaybackSeconds(
      activeScreening,
      mediaDuration,
      scheduleNow,
    );

    if (target == null) {
      node.pause();
      setIsPlaying(false);
      const nextStart = getNextScreeningStart(activeScreening, scheduleNow);
      if (nextStart) {
        toast.info(
          `This showtime has ended. Next screening starts at ${fDateTimeFromUtc(nextStart)}.`,
        );
      } else {
        toast.info('This screening has ended.');
      }
      return false;
    }

    if (Math.abs(node.currentTime - target) > 1.25) {
      syncingRef.current = true;
      node.currentTime = target;
      window.setTimeout(() => {
        syncingRef.current = false;
      }, 400);
    }

    return true;
  }, [
    activeMediaDurationSeconds,
    activeScreening,
    activeShowStatus,
    isLiveScheduledScreening,
    scheduleNow,
    useEmbedPlayer,
  ]);

  const syncEmbedPlayback = useCallback(() => {
    if (!isLiveScheduledScreening || !activeScreening || !useEmbedPlayer) {
      return false;
    }

    const target = getSyncedPlaybackSeconds(
      activeScreening,
      activeMediaDurationSeconds,
      scheduleNow,
    );

    if (target == null) {
      setIsPlaying(false);
      const nextStart = getNextScreeningStart(activeScreening, scheduleNow);
      if (nextStart) {
        toast.info(
          `This showtime has ended. Next screening starts at ${fDateTimeFromUtc(nextStart)}.`,
        );
      } else {
        toast.info('This screening has ended.');
      }
      return false;
    }

    embedPlayerRef.current?.seekTo(target, 'seconds');
    return true;
  }, [
    activeMediaDurationSeconds,
    activeScreening,
    activeShowStatus,
    isLiveScheduledScreening,
    scheduleNow,
    useEmbedPlayer,
  ]);

  const seatSession = useMemo(() => {
    if (seatMapMode === 'view' && viewingReservation) {
      return {
        cinemaName: 'Cosset Universe Cinema',
        sessionLabel:
          formatScreeningSchedule(viewingReservation) || 'Open screening',
        roomLabel: category?.title || 'Cinema room',
      };
    }

    return {
      cinemaName: 'Cosset Universe Cinema',
      sessionLabel: activeScreening
        ? formatScreeningSchedule(activeScreening) || 'Open screening'
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
    setScreeningUnlocked(false);
    setPaymentOpen(false);
    setPaymentQuote(null);

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
    if (!isPlaying || useEmbedPlayer) return undefined;

    const node = videoRef.current;
    if (!node || !resolvedVideoUrl) return undefined;

    const startPlayback = () => {
      if (isLiveScheduledScreening && !syncNativePlayback()) {
        return;
      }

      const playPromise = node.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay may be blocked until user gesture — Watch now already is a gesture.
        });
      }
    };

    if (node.readyState >= 1) {
      startPlayback();
    } else {
      node.addEventListener('loadedmetadata', startPlayback, { once: true });
    }

    const handleSeeking = () => {
      if (!isLiveScheduledScreening || syncingRef.current) return;
      syncNativePlayback();
    };

    node.addEventListener('seeking', handleSeeking);

    return () => {
      node.removeEventListener('loadedmetadata', startPlayback);
      node.removeEventListener('seeking', handleSeeking);
    };
  }, [
    isPlaying,
    resolvedVideoUrl,
    useEmbedPlayer,
    activeFilm?.id,
    isLiveScheduledScreening,
    syncNativePlayback,
  ]);

  useEffect(() => {
    if (!isPlaying || !isLiveScheduledScreening) {
      return undefined;
    }

    const tick = () => {
      if (useEmbedPlayer) {
        syncEmbedPlayback();
      } else {
        syncNativePlayback();
      }
    };

    const intervalId = window.setInterval(tick, 4000);
    return () => window.clearInterval(intervalId);
  }, [
    isPlaying,
    isLiveScheduledScreening,
    useEmbedPlayer,
    syncNativePlayback,
    syncEmbedPlayback,
  ]);

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

  const finishPlayback = useCallback(async () => {
    if (!activeFilm?.videoUrl) {
      toast.error('This film has no video yet.');
      return;
    }

    const seatId = selectedSeatIds[0] || activeReservation?.seatIds?.[0];

    // Seat is optional for paid unlock — reservation is only saved when a seat was chosen.
    if (seatId && viewerCustomerId && activeScreening?.id) {
      try {
        setConfirming(true);

        const screeningId = Number(activeScreening.id);
        const existingReservation =
          activeReservation ||
          (Number.isFinite(screeningId)
            ? reservationsByScreeningId.get(screeningId)
            : undefined) ||
          null;

        if (existingReservation) {
          await updateCinemaReservationSeats(
            existingReservation.id,
            { customerId: viewerCustomerId, seatIds: [seatId] },
            {
              ownerCustomerId: String(activeFilm.customerId || catalogOwnerId || '') || undefined,
              category: resolvedCategory || undefined,
            },
          );
        } else {
          await createCinemaReservation(
            {
              screeningId: Number(activeScreening.id),
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

    if (!url) {
      toast.error('Unable to load the screening video.');
      return;
    }

    setPaymentOpen(false);
    setPaymentQuote(null);
    setScreeningUnlocked(true);
    setSeatMapOpen(false);
    setSeatMapMode('select');
    setViewingReservation(null);
    setIsPlaying(true);
  }, [
    activeFilm?.customerId,
    activeFilm?.videoUrl,
    activeReservation,
    activeScreening?.id,
    catalogOwnerId,
    resolvedCategory,
    resolvedVideoUrl,
    reservationsByScreeningId,
    selectedSeatIds,
    viewerCustomerId,
  ]);

  const handleStartPlayback = async () => {
    const seatId = selectedSeatIds[0] || activeReservation?.seatIds?.[0];
    if (!activeFilm?.videoUrl || !seatId) return;

    const status = activeScreening
      ? getScreeningShowStatus(activeScreening, scheduleNow, activeMediaDurationSeconds)
      : 'unscheduled';
    if (status !== 'now' || !isPaidViewer) {
      const baseFee = activeScreening ? parseScreeningFee(activeScreening.price) : 0;
      const charge = isPaidViewer ? baseFee / 2 : baseFee;

      setPaymentQuote({
        screeningId: Number(activeScreening?.id || 0),
        filmTitle: activeFilm.title,
        plan: viewerPlan,
        accessState: status === 'now' ? 'scheduled-live' : 'off-schedule',
        baseFee,
        charge,
      });
      setPaymentOpen(true);
      setSeatMapOpen(false);
      return;
    }

    if (isLiveScheduledScreening && activeScreening) {
      const liveStatus = getScreeningShowStatus(
        activeScreening,
        scheduleNow,
        activeMediaDurationSeconds,
      );
      if (liveStatus === 'upcoming') {
        const nextStart = getNextScreeningStart(activeScreening, scheduleNow);
        toast.info(
          nextStart
            ? `Screening starts ${fTime(nextStart, formatStr.time)}(${fDateTimeFromUtc(nextStart, formatStr.time)} UTC).`
            : 'Screening starts at the next Fri–Sun showtime.',
        );
        return;
      }
      if (liveStatus === 'past') {
        toast.info('This screening has ended.');
        return;
      }

      const target = getSyncedPlaybackSeconds(
        activeScreening,
        activeMediaDurationSeconds,
        scheduleNow,
      );
      if (target == null) {
        toast.info('This screening is not available to watch right now.');
        return;
      }
    }

    if (viewerCustomerId && activeScreening?.id) {
      try {
        setConfirming(true);

        const screeningId = Number(activeScreening.id);
        const existingReservation =
          activeReservation ||
          (Number.isFinite(screeningId)
            ? reservationsByScreeningId.get(screeningId)
            : undefined) ||
          null;

        if (existingReservation) {
          await updateCinemaReservationSeats(
            existingReservation.id,
            { customerId: viewerCustomerId, seatIds: [seatId] },
            {
              ownerCustomerId: String(activeFilm.customerId || catalogOwnerId || '') || undefined,
              category: resolvedCategory || undefined,
            },
          );
        } else {
          await createCinemaReservation(
            {
              screeningId: Number(activeScreening.id),
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

  const openPaymentDialog = useCallback(() => {
    if (!activeFilm?.title) return;

    const baseFee = activeScreening ? parseScreeningFee(activeScreening.price) : 0;
    const charge = isPaidViewer ? baseFee / 2 : baseFee;

    setPaymentQuote({
      screeningId: Number(activeScreening?.id || 0),
      filmTitle: activeFilm.title,
      plan: viewerPlan,
      accessState: activeShowStatus === 'now' ? 'scheduled-live' : 'off-schedule',
      baseFee,
      charge,
    });
    setPaymentOpen(true);
  }, [
    activeFilm?.title,
    activeScreening,
    activeShowStatus,
    isPaidViewer,
    viewerPlan,
  ]);

  const handleConfirmPayment = useCallback(async () => {
    try {
      setPaying(true);
      await finishPlayback();
    } finally {
      setPaying(false);
    }
  }, [finishPlayback]);

  const handleClosePayment = useCallback(() => {
    if (paying) return;
    setPaymentOpen(false);
    setPaymentQuote(null);
  }, [paying]);

  const handleClosePlayer = () => {
    const node = videoRef.current;
    if (node) {
      node.pause();
      node.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSelectCinemaTab = useCallback(
    async (nextCategoryId: CinemaCategory) => {
      if (nextCategoryId === activeCategoryId) return;

      if (authenticated && user?.id && catalogOwnerId && resolvedCategory) {
        const uid = String(user.id);
        setParticipants((prev) => removeParticipant(prev, uid));
        try {
          await leaveCinemaPresence(catalogOwnerId, resolvedCategory);
        } catch {
          // still switch halls
        }
      }

      const node = videoRef.current;
      if (node) {
        node.pause();
        node.currentTime = 0;
      }

      setIsPlaying(false);
      setParticipants([]);
      setActiveFilmId(null);
      setSelectedSeatIds([]);
      setSeatMapOpen(false);
      setSeatMapMode('select');
      setViewingReservation(null);
      setScreeningUnlocked(false);
      setPaymentOpen(false);
      setPaymentQuote(null);
      setResolvedVideoUrl('');
      setActiveCategoryId(nextCategoryId);

      const params = new URLSearchParams();
      if (ownerId) {
        params.set('ownerId', String(ownerId));
      }
      const query = params.toString();
      router.replace(
        `${paths.dashboard.community.cinema.view(nextCategoryId)}${query ? `?${query}` : ''}`,
      );
    },
    [
      activeCategoryId,
      authenticated,
      catalogOwnerId,
      ownerId,
      resolvedCategory,
      router,
      user?.id,
    ],
  );

  const handleSelectFilm = (filmId: number) => {
    if (filmId !== activeFilm?.id) {
      handleClosePlayer();
      setSelectedSeatIds([]);
      setSeatMapOpen(false);
      setSeatMapMode('select');
      setViewingReservation(null);
      setScreeningUnlocked(false);
      setPaymentOpen(false);
      setPaymentQuote(null);
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
          background: category.overlay,
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 1.25, md: 2 },
          borderBottom: `1px solid rgba(${category.accentRgb}, 0.22)`,
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          minHeight: { xs: 56, md: 72 },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            minWidth: 0,
            maxWidth: { xs: '42%', sm: '34%', md: '30%' },
            zIndex: 1,
            flexShrink: 1,
          }}
        >
          <Iconify icon={category.icon} width={22} sx={{ color: accent, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontFamily: CINEMA_SERIF,
                fontWeight: 700,
                fontSize: { xs: '0.92rem', sm: '1.05rem' },
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
                display: { xs: 'none', sm: 'block' },
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
          noWrap
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '34%', sm: '32%', md: '30%' },
            textAlign: 'center',
            fontFamily: CINEMA_SERIF,
            color: accent,
            fontWeight: 700,
            fontSize: { xs: '0.68rem', sm: '0.88rem', md: '1.2rem' },
            letterSpacing: { xs: '0.04em', md: '0.06em' },
            lineHeight: 1.2,
            textTransform: activeFilm ? 'none' : 'uppercase',
            pointerEvents: 'none',
            px: 1,
          }}
        >
          {activeFilm?.title || category.headline}
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
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              p: 0.4,
              borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.4)',
              border: `1px solid rgba(${category.accentRgb}, 0.28)`,
              backdropFilter: 'blur(8px)',
              maxWidth: { xs: 210, sm: 360, md: 440 },
            }}
          >
            {CINEMA_CATEGORIES.map((item) => {
              const selected = item.id === activeCategoryId;
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="small"
                  onClick={() => handleSelectCinemaTab(item.id)}
                  sx={{
                    minWidth: 0,
                    px: { xs: 1, sm: 1.25 },
                    py: 0.55,
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: { xs: '0.68rem', sm: '0.75rem', md: '0.8rem' },
                    lineHeight: 1.2,
                    color: selected ? '#1A1208' : 'rgba(255,248,231,0.82)',
                    bgcolor: selected ? item.accent : 'transparent',
                    border: selected ? 'none' : '1px solid transparent',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      bgcolor: selected ? item.accent : 'rgba(255,255,255,0.08)',
                      opacity: selected ? 0.94 : 1,
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {item.title}
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                    {item.shortTitle}
                  </Box>
                </Button>
              );
            })}
          </Stack>

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
            key={`${catalogOwnerId}-${resolvedCategory}`}
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
                  <Player
                    ref={embedPlayerRef}
                    url={resolvedVideoUrl}
                    playing
                    controls={!isLiveScheduledScreening}
                    width="100%"
                    height="100%"
                    onDuration={(duration: number) => {
                      if (
                        activeFilm?.id != null &&
                        Number.isFinite(duration) &&
                        duration > 0
                      ) {
                        setFilmDurationById((prev) =>
                          prev[activeFilm.id] === duration
                            ? prev
                            : { ...prev, [activeFilm.id]: duration },
                        );
                      }
                    }}
                    onReady={() => {
                      if (isLiveScheduledScreening) {
                        syncEmbedPlayback();
                      }
                    }}
                    onSeek={() => {
                      if (isLiveScheduledScreening) {
                        syncEmbedPlayback();
                      }
                    }}
                  />
                </Box>
              ) : (
                <Box
                  component="video"
                  ref={videoRef}
                  key={resolvedVideoUrl}
                  src={resolvedVideoUrl}
                  controls
                  controlsList={isLiveScheduledScreening ? 'nodownload noplaybackrate' : undefined}
                  autoPlay
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    if (
                      activeFilm?.id != null &&
                      Number.isFinite(duration) &&
                      duration > 0
                    ) {
                      setFilmDurationById((prev) =>
                        prev[activeFilm.id] === duration
                          ? prev
                          : { ...prev, [activeFilm.id]: duration },
                      );
                    }
                  }}
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
                  <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center', width: 1, px: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: CINEMA_SERIF,
                        fontWeight: 700,
                        fontSize: { xs: '0.98rem', sm: '1.2rem', md: '1.45rem' },
                        lineHeight: 1.25,
                        color: '#FFF8E7',
                        textShadow: '0 3px 14px rgba(0,0,0,0.7)',
                        maxWidth: 1,
                        px: 0.5,
                      }}
                    >
                      {activeFilm.title}
                    </Typography>

                    {activeScheduleLabels.length || activeScreening ? (
                      <Stack spacing={0.35} alignItems="center" sx={{ width: 1, maxWidth: 420 }}>
                        <Stack
                          direction="row"
                          spacing={{ xs: 1.25, sm: 1.75 }}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Stack spacing={0.15} alignItems="flex-start">
                            {activeScheduleLabels.length ? (
                              activeScheduleLabels.map((label) => (
                                <Typography
                                  key={label}
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(245,230,200,0.75)',
                                    fontSize: { xs: '0.68rem', sm: '0.75rem' },
                                    lineHeight: 1.35,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {label}
                                </Typography>
                              ))
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'rgba(245,230,200,0.75)',
                                  fontSize: { xs: '0.68rem', sm: '0.75rem' },
                                  lineHeight: 1.35,
                                }}
                              >
                                No fixed showtime
                              </Typography>
                            )}
                          </Stack>

                          {getCinemaFilmShowStatusLabel(activeShowStatus) ? (
                            <Chip
                              size="small"
                              label={getCinemaFilmShowStatusLabel(activeShowStatus)}
                              sx={{
                                flexShrink: 0,
                                fontWeight: 700,
                                fontSize: { xs: '0.65rem', sm: '0.72rem' },
                                height: 24,
                                color: '#1A1208',
                                bgcolor:
                                  activeShowStatus === 'now'
                                    ? accent
                                    : activeShowStatus === 'upcoming'
                                      ? 'rgba(245,230,200,0.92)'
                                      : 'rgba(245,230,200,0.55)',
                              }}
                            />
                          ) : null}

                          {activeRemainingLabel ? (
                            <Typography
                              variant="caption"
                              sx={{
                                flexShrink: 0,
                                color: 'info.light',
                                fontWeight: 700,
                                fontSize: { xs: '0.65rem', sm: '0.72rem' },
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {activeRemainingLabel === 'now'
                                ? 'starting now'
                                : `${activeRemainingLabel} left`}
                            </Typography>
                          ) : null}
                        </Stack>

                        {isLiveScheduledScreening ? (
                          <Typography
                            variant="caption"
                            sx={{ color: 'rgba(245,230,200,0.75)', fontSize: { xs: '0.65rem', sm: '0.72rem' } }}
                          >
                            Live synced screening
                          </Typography>
                        ) : null}
                      </Stack>
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
                          if (requiresPayment) {
                            openPaymentDialog();
                            return;
                          }

                          if (isSyncedScreening && activeShowStatus === 'past') {
                            toast.info('This screening has ended.');
                            return;
                          }

                          // Upcoming fixed-time or open (no showtime): show screening / seat info.
                          if (
                            activeShowStatus === 'unscheduled' ||
                            (isSyncedScreening && activeShowStatus === 'upcoming')
                          ) {
                            if (activeReservation && hasReservationSeat(activeReservation)) {
                              handleViewReservation(activeReservation);
                            } else {
                              handleOpenSeatSelection(activeReservation);
                            }
                            return;
                          }

                          if (activeReservation?.seatIds?.[0]) {
                            handleStartPlayback();
                            return;
                          }

                          handleOpenSeatSelection(activeReservation);
                        }}
                        variant="contained"
                        disabled={isSyncedScreening && activeShowStatus === 'past'}
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
                        {(() => {
                          if (isSyncedScreening && activeShowStatus === 'upcoming') {
                            const localLabel = activeNextStart
                              ? fTime(activeNextStart, formatStr.dateTime)
                              : null;
                            const utcLabel = activeNextStart
                              ? fDateTimeFromUtc(activeNextStart, formatStr.time)
                              : null;

                            if (!localLabel || !utcLabel) {
                              return 'Starts soon';
                            }

                            return (
                              <>
                                Starts at{' '}
                                <Box component="span" sx={{ color: 'info.dark' }}>
                                  {localLabel}
                                </Box>
                                ({utcLabel} UTC)
                              </>
                            );
                          }

                          if (isSyncedScreening && activeShowStatus === 'past') {
                            return 'Screening ended';
                          }

                          if (isSyncedScreening && activeShowStatus === 'now') {
                            return headerSeatLabel
                              ? `Join screening · ${headerSeatLabel}`
                              : 'Join screening';
                          }

                          return headerSeatLabel
                            ? `Screening info · ${headerSeatLabel}`
                            : 'Screening info';
                        })()}
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
                  const mediaDurationSeconds = filmDurationById[film.id] ?? null;
                  const nextScreening = getNextFilmScreening(
                    film,
                    scheduleNow,
                    mediaDurationSeconds,
                  );
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
                      mediaDurationSeconds={mediaDurationSeconds}
                      scheduleNow={scheduleNow}
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

      <Dialog
        open={paymentOpen && Boolean(paymentQuote)}
        onClose={handleClosePayment}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Typography sx={{ fontFamily: CINEMA_SERIF, fontWeight: 700, fontSize: '1.25rem' }}>
            Unlock screening
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {paymentQuote?.accessState === 'scheduled-live'
              ? 'This scheduled screening is reserved for paid users. Confirm the access fee to watch now.'
              : 'This screening is outside the scheduled window. Confirm the access fee to watch once now.'}
          </Typography>
          <IconButton
            aria-label="Close"
            onClick={handleClosePayment}
            disabled={paying}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity={paymentQuote?.accessState === 'scheduled-live' ? 'warning' : 'info'}>
              {paymentQuote?.accessState === 'scheduled-live'
                ? 'Paid viewers can start this scheduled screening directly. Free viewers can pay the full access fee to unlock one watch.'
                : 'Paid viewers pay half of the screening fee. Free viewers pay the full screening fee.'}
            </Alert>

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Film
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {paymentQuote?.filmTitle || activeFilm?.title || 'Screening'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Screening fee
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {paymentQuote?.baseFee
                      ? `${formatCinemaMoney(paymentQuote.baseFee)}`
                      : 'Free'}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    Your price
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {paymentQuote?.charge ? formatCinemaMoney(paymentQuote.charge) : 'Free'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary">
              This unlocks one screening session for the current film. If you leave the player,
              you can purchase access again the next time you want to watch outside the schedule.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClosePayment} disabled={paying} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmPayment} disabled={paying} variant="contained">
            {paymentQuote?.charge ? `Pay ${formatCinemaMoney(paymentQuote.charge)} & watch` : 'Watch now'}
          </Button>
        </DialogActions>
      </Dialog>

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
