import type { IDateValue } from 'src/types/common';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening, ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import { fDateTimeFromUtc, normalizeUtcTimestamp } from 'src/utils/format-time';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// ----------------------------------------------------------------------

export type CinemaFilmShowStatus = 'now' | 'upcoming' | 'past' | 'unscheduled';

const parseInstant = (value?: IDateValue | Date | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const utcValue = normalizeUtcTimestamp(value);
  if (!utcValue) {
    return null;
  }

  const parsed = new Date(utcValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  // Fallback for uncommon Postgres/Neon offset strings.
  const viaDayjs = dayjs.utc(utcValue);
  return viaDayjs.isValid() ? viaDayjs.toDate() : null;
};

/** Format a UTC instant for `<input type="datetime-local">` using UTC wall-clock parts. */
export const toDatetimeLocalValue = (value?: IDateValue | Date | null) => {
  const parsed = parseInstant(value);

  if (!parsed) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}T${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}`;
};

/** Parse a datetime-local string as UTC (not the browser's local timezone). */
export const toIsoOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // datetime-local is `YYYY-MM-DDTHH:mm` (optionally with seconds).
  const normalized = trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
    ? `${normalized}:00`
    : normalized;
  const hasTimezone = withSeconds.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(withSeconds);
  const utcValue = hasTimezone ? withSeconds : `${withSeconds}Z`;
  const parsed = new Date(utcValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/** Fallback when the video duration is not loaded yet (keeps two showtimes from merging into one window). */
const DEFAULT_SHOW_DURATION_SECONDS = 3 * 60 * 60;

const positiveDurationSeconds = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const resolveShowDurationSeconds = (mediaDurationSeconds?: number | null) =>
  positiveDurationSeconds(mediaDurationSeconds) ?? DEFAULT_SHOW_DURATION_SECONDS;

/** Sorted unique start times (showAt and optional showAt2). */
export const getScreeningStartInstants = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
) => {
  const starts = [parseInstant(screening.showAt), parseInstant(screening.showAt2)].filter(
    (value): value is Date => Boolean(value),
  );

  starts.sort((a, b) => a.getTime() - b.getTime());

  return starts.filter(
    (start, index) => index === 0 || start.getTime() !== starts[index - 1].getTime(),
  );
};

const isShowLiveAt = (
  start: Date,
  now: Date,
  mediaDurationSeconds?: number | null,
  nextStart?: Date | null,
) => {
  const nowMs = now.getTime();
  const startMs = start.getTime();
  if (nowMs < startMs) {
    return false;
  }

  // Once the next showtime begins, that show owns the theater.
  if (nextStart && nowMs >= nextStart.getTime()) {
    return false;
  }

  const offsetSeconds = (nowMs - startMs) / 1000;
  return offsetSeconds < resolveShowDurationSeconds(mediaDurationSeconds);
};

/** Active showtime start for the current moment, or null if none is live. */
export const getActiveScreeningStart = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
  now = new Date(),
  mediaDurationSeconds?: number | null,
) => {
  const starts = getScreeningStartInstants(screening);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1] || null;
    if (isShowLiveAt(start, now, mediaDurationSeconds, nextStart)) {
      return start;
    }
  }

  return null;
};

/** Next upcoming showtime start, or null when none remain. */
export const getNextScreeningStart = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
  now = new Date(),
) => {
  const nowMs = now.getTime();
  return getScreeningStartInstants(screening).find((start) => start.getTime() > nowMs) || null;
};

export const getScreeningShowStatus = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
  now = new Date(),
  mediaDurationSeconds?: number | null,
): CinemaFilmShowStatus => {
  const starts = getScreeningStartInstants(screening);

  if (!starts.length) {
    return 'unscheduled';
  }

  // Live during either showAt or showAt2 playback window.
  if (getActiveScreeningStart(screening, now, mediaDurationSeconds)) {
    return 'now';
  }

  // Still upcoming when waiting for the first show OR the second showtime.
  if (getNextScreeningStart(screening, now)) {
    return 'upcoming';
  }

  return 'past';
};

export const getScreeningScheduleLabels = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
) =>
  getScreeningStartInstants(screening)
    .map((start) => {
      const label = fDateTimeFromUtc(start);
      return label ? `${label} UTC` : null;
    })
    .filter((label): label is string => Boolean(label));

export const formatScreeningSchedule = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
) => {
  const labels = getScreeningScheduleLabels(screening);

  if (!labels.length) {
    return null;
  }

  return labels.join(' · ');
};

export const getCinemaFilmShowStatusLabel = (status: CinemaFilmShowStatus) => {
  switch (status) {
    case 'now':
      return 'Now showing';
    case 'upcoming':
      return 'Upcoming';
    case 'past':
      return 'Ended';
    default:
      return null;
  }
};

/** True when this screening has a fixed start time (shared theater timeline). */
export const isFixedTimeScreening = (
  screening?: Pick<ICinemaFilmScreening, 'showAt'> | null,
) => Boolean(parseInstant(screening?.showAt));

/**
 * Seconds into the currently live showtime for synchronized theater playback.
 * Returns null when unscheduled, between showtimes, or outside every show window.
 */
export const getScreeningPlaybackOffsetSeconds = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
  now = new Date(),
  mediaDurationSeconds?: number | null,
): number | null => {
  const activeStart = getActiveScreeningStart(screening, now, mediaDurationSeconds);

  if (!activeStart) {
    return null;
  }

  return (now.getTime() - activeStart.getTime()) / 1000;
};

/**
 * Clamp the schedule offset into a playable media range for the active showtime.
 * Returns null when no showtime is live right now.
 */
export const getSyncedPlaybackSeconds = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
  mediaDurationSeconds?: number | null,
  now = new Date(),
): number | null => {
  const offset = getScreeningPlaybackOffsetSeconds(screening, now, mediaDurationSeconds);

  if (offset == null || offset < 0) {
    return null;
  }

  // Prefer real media length for scrubbing; fall back so a missing duration does not
  // keep the first showtime open until showAt2.
  const duration = resolveShowDurationSeconds(mediaDurationSeconds);
  if (offset >= duration) {
    return null;
  }

  // When the real media duration is known, never seek past the end of the file.
  const mediaDuration = positiveDurationSeconds(mediaDurationSeconds);
  const end = mediaDuration != null ? Math.min(duration, mediaDuration) : duration;

  return Math.min(offset, Math.max(0, end - 0.25));
};

export const getNextFilmScreening = (film: Pick<ICinemaFilm, 'screenings'>) => {
  const screenings = film.screenings || [];

  if (!screenings.length) {
    return null;
  }

  const now = new Date();
  const nowShowing = screenings.find((screening) => getScreeningShowStatus(screening, now) === 'now');
  if (nowShowing) {
    return nowShowing;
  }

  const upcoming = screenings.find((screening) => getScreeningShowStatus(screening, now) === 'upcoming');
  if (upcoming) {
    return upcoming;
  }

  return screenings[screenings.length - 1] || null;
};

export const getDefaultScreening = (
  screenings: ICinemaFilmScreeningWithFilm[],
) => {
  if (!screenings.length) {
    return null;
  }

  const now = new Date();
  const nowShowing = screenings.find((screening) => getScreeningShowStatus(screening, now) === 'now');
  if (nowShowing) {
    return nowShowing;
  }

  const upcoming = screenings.find((screening) => getScreeningShowStatus(screening, now) === 'upcoming');
  if (upcoming) {
    return upcoming;
  }

  return screenings[0];
};
