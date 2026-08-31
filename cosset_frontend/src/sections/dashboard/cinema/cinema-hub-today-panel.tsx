'use client';

import type { Dayjs } from 'dayjs';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import type { ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
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

import { getCinemaCategory, resolveCinemaCategoryId } from './cinema-categories';
import {
  formatScreeningSchedule,
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

type Props = {
  screenings: ICinemaFilmScreeningWithFilm[];
  loading?: boolean;
};

export function CinemaHubTodayPanel({ screenings, loading = false }: Props) {
  const [selectedDay, setSelectedDay] = useState<Dayjs>(() => dayjs());
  const isToday = selectedDay.isSame(dayjs(), 'day');

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

    return [...list].sort((a, b) => {
      const statusRank = (screening: ICinemaFilmScreeningWithFilm) => {
        const status = getScreeningShowStatus(screening, selectedDay.toDate());
        if (status === 'now') return 0;
        if (status === 'upcoming') return 1;
        if (status === 'unscheduled') return 2;
        return 3;
      };

      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;

      return String(a.filmTitle || '').localeCompare(String(b.filmTitle || ''));
    });
  }, [screenings, selectedDay]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: 1,
          maxWidth: 980,
          mx: 'auto',
          px: { xs: 1, sm: 1.5 },
          pointerEvents: 'auto',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'auto minmax(0, 1fr)' },
            gridTemplateRows: { xs: 'auto auto', md: 'auto' },
            gap: { xs: 1.25, md: 2 },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              gridColumn: { xs: '1', md: '1' },
              gridRow: { xs: '1', md: '1' },
              justifySelf: { xs: 'center', md: 'stretch' },
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              bgcolor: 'rgba(8,5,3,0.78)',
              border: `1px solid ${CINEMA_GOLD}55`,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              overflow: 'visible',
              '& .MuiDateCalendar-root': {
                width: { xs: 292, sm: 312 },
                maxHeight: 'none',
                height: 'auto',
                bgcolor: 'transparent',
                color: CINEMA_CREAM,
              },
              '& .MuiDayCalendar-monthContainer': {
                overflow: 'visible',
              },
              '& .MuiPickersSlideTransition-root': {
                minHeight: 240,
              },
              '& .MuiPickersCalendarHeader-label, & .MuiDayCalendar-weekDayLabel, & .MuiPickersYear-yearButton':
                {
                  color: CINEMA_CREAM,
                },
              '& .MuiPickersDay-root': {
                color: CINEMA_CREAM,
                fontWeight: 600,
              },
              '& .MuiPickersDay-root.Mui-selected': {
                bgcolor: CINEMA_GOLD,
                color: '#1A1208',
                '&:hover': { bgcolor: CINEMA_GOLD },
              },
              '& .MuiPickersDay-today': {
                border: `1px solid ${CINEMA_GOLD}`,
              },
              '& .MuiIconButton-root': {
                color: CINEMA_CREAM,
              },
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

          <Stack
            spacing={1}
            sx={{
              gridColumn: { xs: '1', md: '2' },
              gridRow: { xs: '2', md: '1' },
              minWidth: 0,
              // Match calendar height on desktop: contribute 0 to row sizing, then stretch to it.
              height: { xs: 'auto', md: 0 },
              minHeight: { xs: 'auto', md: '100%' },
              maxHeight: { xs: 360, md: 'none' },
              alignSelf: 'stretch',
              borderRadius: 2,
              bgcolor: 'rgba(8,5,3,0.78)',
              border: `1px solid ${CINEMA_GOLD}55`,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
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
                    color: CINEMA_CREAM,
                    lineHeight: 1.2,
                  }}
                >
                  {isToday
                    ? 'Scheduled cinema Today'
                    : `Scheduled cinema · ${selectedDay.format('D MMM')}`}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(245,230,200,0.68)', letterSpacing: '0.04em' }}
                >
                  {selectedDay.format('dddd, MMM D, YYYY')}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${dayScreenings.length} show${dayScreenings.length === 1 ? '' : 's'}`}
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
              ) : dayScreenings.length ? (
                <Stack spacing={0.85}>
                  {dayScreenings.map((screening) => {
                    const categoryId = resolveCinemaCategoryId(String(screening.filmCategory || ''));
                    const category = categoryId ? getCinemaCategory(categoryId) : null;
                    const status = getScreeningShowStatus(screening, selectedDay.toDate());
                    const statusLabel = getCinemaFilmShowStatusLabel(status);
                    const schedule = formatScreeningSchedule(screening) || 'Open screening';
                    const params = new URLSearchParams();
                    if (screening.customerId) {
                      params.set('ownerId', String(screening.customerId));
                    }
                    params.set('filmId', String(screening.filmId));
                    const href = categoryId
                      ? `${paths.dashboard.community.cinema.view(categoryId)}?${params.toString()}`
                      : paths.dashboard.community.cinema.root;
                    const title = screening.filmTitle || 'Untitled film';
                    const accent = category?.accent || CINEMA_GOLD;
                    const roomLabel = category?.shortTitle || 'Cinema room';
                    const roomTitle = category?.title || 'Cinema';

                    return (
                      <Box
                        key={screening.id}
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
                          bgcolor: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${CINEMA_GOLD}28`,
                          transition: (theme) =>
                            theme.transitions.create(['background-color', 'border-color'], {
                              duration: theme.transitions.duration.shorter,
                            }),
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.08)',
                            borderColor: `${CINEMA_GOLD}66`,
                          },
                        }}
                      >
                        <ScreeningPosterThumb
                          posterImage={screening.filmPosterImage}
                          title={title}
                          accent={accent}
                        />

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            noWrap
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: CINEMA_CREAM,
                              lineHeight: 1.25,
                            }}
                          >
                            {title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: 'rgba(245,230,200,0.72)',
                              lineHeight: 1.35,
                            }}
                          >
                            {schedule}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ mt: 0.35, minWidth: 0 }}
                          >
                            <Chip
                              size="small"
                              icon={
                                <Iconify
                                  icon={category?.icon || 'solar:videocamera-record-bold'}
                                  width={12}
                                />
                              }
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
                              sx={{ color: 'rgba(245,230,200,0.62)', fontSize: '0.65rem' }}
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
                              color: status === 'now' ? '#1A1208' : CINEMA_CREAM,
                              bgcolor:
                                status === 'now'
                                  ? CINEMA_GOLD
                                  : status === 'upcoming'
                                    ? 'rgba(25,118,210,0.82)'
                                    : 'rgba(0,0,0,0.45)',
                            }}
                          />
                        ) : null}
                      </Box>
                    );
                  })}
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
                    sx={{ color: 'rgba(245,230,200,0.45)' }}
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(245,230,200,0.72)' }}>
                    No scheduled cinema on this day.
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
