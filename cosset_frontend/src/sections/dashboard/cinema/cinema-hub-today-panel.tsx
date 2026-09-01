'use client';

import type { Dayjs } from 'dayjs';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import type { ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  CINEMA_CATEGORIES,
  getCinemaCategory,
  resolveCinemaCategoryId,
  type CinemaCategory,
  type CinemaCategoryMeta,
} from './cinema-categories';
import { CinemaPosterCard } from './cinema-film-poster-carousel';
import {
  formatScreeningSchedule,
  getNextScreeningStart,
  getCinemaFilmShowStatusLabel,
  getScreeningShowStatus,
  isCinemaWeeklyScreeningDay,
  isFixedTimeScreening,
} from './cinema-film-schedule';
import { CINEMA_CREAM, CINEMA_GOLD, CINEMA_SERIF } from './cinema-theater-theme';

// ----------------------------------------------------------------------

async function resolvePosterImage(posterImage?: string | null) {
  const normalized = (posterImage || '').trim();
  if (!normalized) return '';
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/')
  ) {
    return normalized;
  }
  return (await getS3SignedUrl(normalized)) || normalized;
}

function ScreeningPosterThumb({
  posterImage,
  title,
  accent,
}: {
  posterImage?: string | null;
  title: string;
  accent: string;
}) {
  const [posterUrl, setPosterUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    resolvePosterImage(posterImage).then((url) => {
      if (mounted) setPosterUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [posterImage]);

  return (
    <Box
      sx={{
        width: 44,
        height: 64,
        flexShrink: 0,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#17110D',
        border: `1px solid ${accent}55`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      }}
    >
      {posterUrl ? (
        <Box
          component="img"
          src={posterUrl}
          alt={title}
          sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: 1, height: 1, color: 'rgba(255,255,255,0.35)' }}
        >
          <Iconify icon="solar:clapperboard-play-bold" width={18} />
        </Stack>
      )}
    </Box>
  );
}

function screeningPlaysOnDay(screening: ICinemaFilmScreeningWithFilm, day: Dayjs) {
  if (!isFixedTimeScreening(screening) && screening.showFlexible !== true) {
    return false;
  }

  return isCinemaWeeklyScreeningDay(day.toDate(), screening);
}

function DayWithDots(props: PickersDayProps<Dayjs> & { highlightedDays?: Set<string> }) {
  const { day, outsideCurrentMonth, highlightedDays, ...other } = props;
  const key = day.format('YYYY-MM-DD');
  const hasScreening = Boolean(highlightedDays?.has(key));

  return (
    <Box sx={{ position: 'relative' }}>
      <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />
      {hasScreening && !outsideCurrentMonth ? (
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: CINEMA_GOLD,
          }}
        />
      ) : null}
    </Box>
  );
}

function toFilmFromScreening(
  screening: ICinemaFilmScreeningWithFilm,
  categoryId: CinemaCategory | null,
): ICinemaFilm {
  return {
    id: screening.filmId,
    customerId: screening.customerId,
    category: categoryId || 'classic',
    title: screening.filmTitle || 'Untitled film',
    director: screening.filmDirector,
    year: screening.filmYear,
    description: screening.filmDescription,
    posterImage: screening.filmPosterImage,
    videoUrl: screening.filmVideoUrl,
  };
}

function ScreeningCard({
  screening,
  selectedDay,
  variant = 'list',
  plain = false,
}: {
  screening: ICinemaFilmScreeningWithFilm;
  selectedDay: Dayjs;
  variant?: 'list' | 'poster';
  plain?: boolean;
}) {
  const categoryId = resolveCinemaCategoryId(String(screening.filmCategory || ''));
  const category = categoryId ? getCinemaCategory(categoryId) : null;
  const accent = category?.accent || CINEMA_GOLD;
  const params = new URLSearchParams();
  if (screening.customerId) {
    params.set('ownerId', String(screening.customerId));
  }
  params.set('filmId', String(screening.filmId));
  const href = categoryId
    ? `${paths.dashboard.community.cinema.view(categoryId)}?${params.toString()}`
    : paths.dashboard.community.cinema.root;

  const openScreening = () => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'poster') {
    return (
      <CinemaPosterCard
        film={toFilmFromScreening(screening, categoryId)}
        screening={screening}
        accent={accent}
        fillWidth
        compact
        metaLabel={category?.title}
        referenceDate={selectedDay.toDate()}
        onClick={openScreening}
        actions={
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              openScreening();
            }}
            sx={{
              width: 28,
              height: 28,
              bgcolor: 'rgba(18,12,8,0.88)',
              color: accent,
              border: `1px solid ${accent}66`,
              '&:hover': { bgcolor: 'rgba(30,20,12,0.95)' },
            }}
            aria-label={`Open ${screening.filmTitle || 'film'} in cinema room`}
          >
            <Iconify icon="solar:ticket-bold" width={16} />
          </IconButton>
        }
      />
    );
  }

  const status = getScreeningShowStatus(screening, selectedDay.toDate());
  const statusLabel = getCinemaFilmShowStatusLabel(status);
  const schedule = formatScreeningSchedule(screening) || 'Open screening';
  const title = screening.filmTitle || 'Untitled film';
  const roomLabel = category?.shortTitle || 'Cinema room';
  const roomTitle = category?.title || 'Cinema';

  return (
    <Box
      component={RouterLink}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.1,
        py: 0.75,
        borderRadius: 1.25,
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: plain ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: plain ? '1px solid' : `1px solid ${accent}40`,
        borderColor: plain ? 'divider' : undefined,
        transition: (theme) =>
          theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:hover': {
          bgcolor: plain ? 'action.hover' : 'rgba(255,255,255,0.08)',
          borderColor: plain ? 'divider' : `${accent}88`,
        },
      }}
    >
      <ScreeningPosterThumb posterImage={screening.filmPosterImage} title={title} accent={accent} />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          noWrap
          sx={{
            fontWeight: 700,
            fontSize: '0.88rem',
            color: plain ? 'text.primary' : CINEMA_CREAM,
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: plain ? 'text.secondary' : 'rgba(245,230,200,0.72)',
            lineHeight: 1.35,
          }}
        >
          {schedule}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.35, minWidth: 0 }}>
          <Chip
            size="small"
            icon={<Iconify icon={category?.icon || 'solar:videocamera-record-bold'} width={12} />}
            label={roomLabel}
            sx={{
              height: 20,
              maxWidth: 1,
              fontWeight: 700,
              fontSize: '0.62rem',
              color: accent,
              bgcolor: `${accent}18`,
              border: `1px solid ${accent}66`,
              '& .MuiChip-icon': { color: accent, ml: 0.5 },
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
          <Typography
            variant="caption"
            noWrap
            sx={{ color: plain ? 'text.secondary' : 'rgba(245,230,200,0.62)', fontSize: '0.65rem' }}
          >
            {roomTitle}
          </Typography>
        </Stack>
      </Box>

      {statusLabel ? (
        <Chip
          size="small"
          label={statusLabel}
          sx={{
            flexShrink: 0,
            height: 22,
            fontWeight: 700,
            fontSize: '0.65rem',
            color:
              status === 'now'
                ? '#1A1208'
                : plain && status !== 'upcoming'
                  ? 'text.primary'
                  : CINEMA_CREAM,
            bgcolor:
              status === 'now'
                ? CINEMA_GOLD
                : status === 'upcoming'
                  ? 'rgba(25,118,210,0.82)'
                  : plain
                    ? 'action.selected'
                    : 'rgba(0,0,0,0.45)',
          }}
        />
      ) : null}
    </Box>
  );
}

function RoomTodaySection({
  category,
  screening,
  selectedDay,
  isToday,
  loading,
}: {
  category: CinemaCategoryMeta;
  screening: ICinemaFilmScreeningWithFilm | null;
  selectedDay: Dayjs;
  isToday: boolean;
  loading?: boolean;
}) {
  const roomHeading = isToday
    ? `Today ${category.shortTitle}`
    : `${category.shortTitle} · ${selectedDay.format('D MMM')}`;

  return (
    <Stack
      spacing={1}
      sx={{
        minWidth: 0,
        width: { sm: '66.67%' },
        maxWidth: { sm: '66.67%' },
        justifySelf: 'center',
        minHeight: { xs: 160, sm: 187, md: 200 },
        height: 1,
        borderRadius: 2,
        bgcolor: 'rgba(8,5,3,0.78)',
        border: `1px solid ${category.accent}55`,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        px: { xs: 1, sm: 1.15 },
        py: { xs: 1, sm: 1.1 },
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              fontWeight: 700,
              fontSize: { xs: '0.82rem', sm: '0.92rem' },
              color: CINEMA_CREAM,
              lineHeight: 1.2,
            }}
          >
            {roomHeading}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.25,
              color: category.textColor || CINEMA_CREAM,
              opacity: 0.72,
              lineHeight: 1.35,
              fontSize: '0.68rem',
            }}
          >
            {category.title}
          </Typography>
        </Box>
        <Iconify icon={category.icon} width={18} sx={{ color: category.accent, flexShrink: 0 }} />
      </Stack>

      <Box sx={{ flex: 1, minHeight: { xs: 115, sm: 140, md: 147 } }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
            <CircularProgress size={20} sx={{ color: category.accent }} />
          </Stack>
        ) : screening ? (
          <ScreeningCard screening={screening} selectedDay={selectedDay} variant="poster" />
        ) : (
          <Stack
            spacing={0.75}
            alignItems="center"
            justifyContent="center"
            sx={{ height: 1, minHeight: { xs: 115, sm: 140, md: 147 }, textAlign: 'center', px: 1.5 }}
          >
            <Iconify
              icon="solar:clapperboard-play-bold"
              width={26}
              sx={{ color: 'rgba(245,230,200,0.35)' }}
            />
            <Typography variant="body2" sx={{ color: 'rgba(245,230,200,0.68)' }}>
              No show scheduled today.
            </Typography>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

type Props = {
  screenings: ICinemaFilmScreeningWithFilm[];
  loading?: boolean;
  /** `rooms` = one now/upcoming film per cinema room; `all` = every screening that day. */
  mode?: 'rooms' | 'all';
  showCalendar?: boolean;
};

export function CinemaTodayDateLabel({ day = dayjs(), plain = false }: { day?: Dayjs; plain?: boolean }) {
  const isToday = day.isSame(dayjs(), 'day');

  return (
    <Typography
      variant="caption"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        textAlign: 'center',
        px: isToday ? 1.25 : 0,
        py: isToday ? 0.35 : 0,
        borderRadius: 999,
        letterSpacing: '0.04em',
        fontWeight: isToday ? 800 : 600,
        color: isToday ? '#1A1208' : plain ? 'text.secondary' : CINEMA_CREAM,
        bgcolor: isToday ? CINEMA_GOLD : 'transparent',
        boxShadow: isToday ? `0 0 0 1px ${CINEMA_GOLD}` : 'none',
        textShadow: isToday || plain ? 'none' : '0 1px 6px rgba(0,0,0,0.45)',
      }}
    >
      {day.format('dddd, MMM D, YYYY')}
    </Typography>
  );
}

export function CinemaHubTodayPanel({
  screenings,
  loading = false,
  mode = 'rooms',
  showCalendar = true,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<Dayjs>(() => dayjs());
  const isToday = selectedDay.isSame(dayjs(), 'day');
  const roomsMode = mode === 'rooms';

  useEffect(() => {
    if (!showCalendar) {
      setSelectedDay(dayjs());
    }
  }, [showCalendar]);

  const highlightedDays = useMemo(() => {
    const keys = new Set<string>();
    const start = selectedDay.startOf('month').subtract(7, 'day');
    const end = selectedDay.endOf('month').add(7, 'day');

    for (
      let cursor = start;
      cursor.isBefore(end) || cursor.isSame(end, 'day');
      cursor = cursor.add(1, 'day')
    ) {
      const key = cursor.format('YYYY-MM-DD');
      if (screenings.some((screening) => screeningPlaysOnDay(screening, cursor))) {
        keys.add(key);
      }
    }

    return keys;
  }, [screenings, selectedDay]);

  const dayScreenings = useMemo(() => {
    const list = screenings.filter((screening) => screeningPlaysOnDay(screening, selectedDay));
    const dayDate = selectedDay.toDate();

    const statusRank = (screening: ICinemaFilmScreeningWithFilm) => {
      const status = getScreeningShowStatus(screening, dayDate);
      if (status === 'now') return 0;
      if (status === 'upcoming') return 1;
      if (status === 'unscheduled') return 2;
      return 3;
    };

    const sortKey = (screening: ICinemaFilmScreeningWithFilm) => {
      const status = getScreeningShowStatus(screening, dayDate);
      if (status === 'now') return 0;
      const nextStart = getNextScreeningStart(screening, dayDate);
      return nextStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
    };

    const byStatusThenTitle = (a: ICinemaFilmScreeningWithFilm, b: ICinemaFilmScreeningWithFilm) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;

      const timeDiff = sortKey(a) - sortKey(b);
      if (timeDiff !== 0) return timeDiff;

      return String(a.filmTitle || '').localeCompare(String(b.filmTitle || ''));
    };

    if (!roomsMode) {
      return [...list].sort(byStatusThenTitle);
    }

    return [];
  }, [roomsMode, screenings, selectedDay]);

  const roomFeaturedScreenings = useMemo(() => {
    if (!roomsMode) {
      return [];
    }

    const list = screenings.filter((screening) => screeningPlaysOnDay(screening, selectedDay));
    const dayDate = selectedDay.toDate();

    const statusRank = (screening: ICinemaFilmScreeningWithFilm) => {
      const status = getScreeningShowStatus(screening, dayDate);
      if (status === 'now') return 0;
      if (status === 'upcoming') return 1;
      if (status === 'unscheduled') return 2;
      return 3;
    };

    const sortKey = (screening: ICinemaFilmScreeningWithFilm) => {
      const status = getScreeningShowStatus(screening, dayDate);
      if (status === 'now') return 0;
      const nextStart = getNextScreeningStart(screening, dayDate);
      return nextStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
    };

    const byStatusThenTitle = (a: ICinemaFilmScreeningWithFilm, b: ICinemaFilmScreeningWithFilm) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;

      const timeDiff = sortKey(a) - sortKey(b);
      if (timeDiff !== 0) return timeDiff;

      return String(a.filmTitle || '').localeCompare(String(b.filmTitle || ''));
    };

    return CINEMA_CATEGORIES.map((category) => {
      const roomShows = list.filter((screening) => {
        if (resolveCinemaCategoryId(String(screening.filmCategory || '')) !== category.id) {
          return false;
        }
        const status = getScreeningShowStatus(screening, dayDate);
        return status === 'now' || status === 'upcoming';
      });

      const screening = roomShows.length
        ? [...roomShows].sort(byStatusThenTitle)[0]
        : null;

      return { category, screening };
    });
  }, [roomsMode, screenings, selectedDay]);

  const splitRoomsLayout = roomsMode && !showCalendar;
  const plainSurface = !roomsMode && showCalendar;

  const heading = roomsMode
    ? isToday
      ? 'Cinema rooms Today'
      : `Cinema rooms · ${selectedDay.format('D MMM')}`
    : isToday
      ? 'Scheduled cinema Today'
      : `Scheduled cinema · ${selectedDay.format('D MMM')}`;

  const countLabel = roomsMode
    ? `${roomFeaturedScreenings.filter((item) => item.screening).length} room${
        roomFeaturedScreenings.filter((item) => item.screening).length === 1 ? '' : 's'
      }`
    : `${dayScreenings.length} show${dayScreenings.length === 1 ? '' : 's'}`;

  const listScreenings = useMemo(() => {
    if (roomsMode) {
      return roomFeaturedScreenings
        .map((item) => item.screening)
        .filter((screening): screening is ICinemaFilmScreeningWithFilm => Boolean(screening));
    }

    return dayScreenings;
  }, [dayScreenings, roomFeaturedScreenings, roomsMode]);

  const emptyMessage = roomsMode
    ? 'No cinema rooms scheduled on this day.'
    : 'No scheduled cinema on this day.';

  const dateLabel = <CinemaTodayDateLabel day={selectedDay} plain={plainSurface} />;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: 1,
          maxWidth: splitRoomsLayout ? { xs: 1, sm: 880, md: 960 } : showCalendar ? 980 : 560,
          mx: 'auto',
          px: { xs: 1, sm: splitRoomsLayout ? 1.5 : 1.5 },
          pointerEvents: 'auto',
        }}
      >
        {splitRoomsLayout ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              columnGap: 0,
              rowGap: { xs: 2, sm: 0 },
              alignItems: 'stretch',
            }}
          >
            {roomFeaturedScreenings[0] ? (
              <RoomTodaySection
                category={roomFeaturedScreenings[0].category}
                screening={roomFeaturedScreenings[0].screening}
                selectedDay={selectedDay}
                isToday={isToday}
                loading={loading}
              />
            ) : null}

            <Box
              aria-hidden
              sx={{
                display: { xs: 'none', sm: 'block' },
                minHeight: 1,
              }}
            />

            {roomFeaturedScreenings[1] ? (
              <RoomTodaySection
                category={roomFeaturedScreenings[1].category}
                screening={roomFeaturedScreenings[1].screening}
                selectedDay={selectedDay}
                isToday={isToday}
                loading={loading}
              />
            ) : null}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: showCalendar
                ? { xs: '1fr', md: 'auto minmax(0, 1fr)' }
                : '1fr',
              gridTemplateRows: showCalendar ? { xs: 'auto auto', md: 'auto' } : 'auto',
              gap: { xs: 1.25, md: 2 },
              alignItems: 'stretch',
            }}
          >
          {showCalendar ? (
            <Box
              sx={{
                gridColumn: { xs: '1', md: '1' },
                gridRow: { xs: '1', md: '1' },
                justifySelf: { xs: 'center', md: 'stretch' },
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                bgcolor: plainSurface ? 'transparent' : 'rgba(8,5,3,0.78)',
                border: plainSurface ? '1px solid' : `1px solid ${CINEMA_GOLD}55`,
                borderColor: plainSurface ? 'divider' : undefined,
                backdropFilter: plainSurface ? 'none' : 'blur(10px)',
                boxShadow: plainSurface ? 'none' : '0 16px 40px rgba(0,0,0,0.45)',
                overflow: 'visible',
                '& .MuiDateCalendar-root': {
                  width: { xs: 292, sm: 312 },
                  maxHeight: 'none',
                  height: 'auto',
                  bgcolor: 'transparent',
                  color: plainSurface ? 'text.primary' : CINEMA_CREAM,
                },
                '& .MuiDayCalendar-monthContainer': {
                  overflow: 'visible',
                },
                '& .MuiPickersSlideTransition-root': {
                  minHeight: 240,
                },
                ...(plainSurface
                  ? {}
                  : {
                      '& .MuiPickersCalendarHeader-label, & .MuiDayCalendar-weekDayLabel, & .MuiPickersYear-yearButton':
                        {
                          color: CINEMA_CREAM,
                        },
                      '& .MuiPickersDay-root': {
                        color: CINEMA_CREAM,
                        fontWeight: 600,
                      },
                    }),
                '& .MuiPickersDay-root.Mui-selected': {
                  bgcolor: CINEMA_GOLD,
                  color: '#1A1208',
                  fontWeight: 800,
                  '&:hover': { bgcolor: CINEMA_GOLD },
                  '&:focus': { bgcolor: CINEMA_GOLD },
                },
                '& .MuiPickersDay-today:not(.Mui-selected)': {
                  bgcolor: `${CINEMA_GOLD}33`,
                  border: `2px solid ${CINEMA_GOLD}`,
                  color: CINEMA_GOLD,
                  fontWeight: 800,
                },
                '& .MuiPickersDay-today.Mui-selected': {
                  bgcolor: CINEMA_GOLD,
                  color: '#1A1208',
                  border: `2px solid ${plainSurface ? 'background.paper' : CINEMA_CREAM}`,
                  fontWeight: 800,
                },
                ...(plainSurface
                  ? {}
                  : {
                      '& .MuiIconButton-root': {
                        color: CINEMA_CREAM,
                      },
                    }),
              }}
            >
              <DateCalendar
                value={selectedDay}
                onChange={(value) => {
                  if (value) setSelectedDay(value);
                }}
                slots={{ day: DayWithDots }}
                slotProps={{
                  day: {
                    highlightedDays,
                  } as any,
                }}
              />
            </Box>
          ) : null}

          <Stack
            spacing={1}
            sx={{
              gridColumn: showCalendar ? { xs: '1', md: '2' } : '1',
              gridRow: showCalendar ? { xs: '2', md: '1' } : '1',
              minWidth: 0,
              height: showCalendar ? { xs: 'auto', md: 0 } : 'auto',
              minHeight: showCalendar ? { xs: 'auto', md: '100%' } : 'auto',
              maxHeight: showCalendar ? { xs: 360, md: 'none' } : { xs: 360, sm: 420 },
              alignSelf: 'stretch',
              borderRadius: 2,
              bgcolor: plainSurface ? 'transparent' : 'rgba(8,5,3,0.78)',
              border: plainSurface ? '1px solid' : `1px solid ${CINEMA_GOLD}55`,
              borderColor: plainSurface ? 'divider' : undefined,
              backdropFilter: plainSurface ? 'none' : 'blur(10px)',
              boxShadow: plainSurface ? 'none' : '0 16px 40px rgba(0,0,0,0.45)',
              px: 1.5,
              py: 1.25,
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: CINEMA_SERIF,
                    fontWeight: 700,
                    fontSize: { xs: '1rem', sm: '1.15rem' },
                    color: plainSurface ? 'text.primary' : CINEMA_CREAM,
                    lineHeight: 1.2,
                  }}
                >
                  {heading}
                </Typography>
                {dateLabel}
              </Box>
              <Chip
                size="small"
                label={countLabel}
                sx={{
                  flexShrink: 0,
                  height: 24,
                  fontWeight: 700,
                  bgcolor: `${CINEMA_GOLD}22`,
                  color: CINEMA_GOLD,
                  border: `1px solid ${CINEMA_GOLD}66`,
                }}
              />
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
              {loading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} sx={{ color: CINEMA_GOLD }} />
                </Stack>
              ) : listScreenings.length ? (
                <Stack spacing={0.85}>
                  {listScreenings.map((screening) => (
                    <ScreeningCard
                      key={`${resolveCinemaCategoryId(String(screening.filmCategory || '')) || 'room'}-${screening.id}`}
                      screening={screening}
                      selectedDay={selectedDay}
                      plain={plainSurface}
                    />
                  ))}
                </Stack>
              ) : (
                <Stack
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ height: 1, minHeight: 120, textAlign: 'center', px: 2 }}
                >
                  <Iconify
                    icon="solar:calendar-minimalistic-bold"
                    width={28}
                    sx={{ color: plainSurface ? 'text.disabled' : 'rgba(245,230,200,0.45)' }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: plainSurface ? 'text.secondary' : 'rgba(245,230,200,0.72)' }}
                  >
                    {emptyMessage}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}
