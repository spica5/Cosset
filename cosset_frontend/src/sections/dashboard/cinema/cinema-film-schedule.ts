import type { IDateValue } from 'src/types/common';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening, ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { formatStr, fDateTimeFromUtc, normalizeUtcTimestamp } from 'src/utils/format-time';

dayjs.extend(utc);

// ----------------------------------------------------------------------

export type CinemaFilmShowStatus = 'now' | 'upcoming' | 'past' | 'unscheduled';

/** Weekly screening days in UTC (`Date#getUTCDay`): Friday, Saturday, Sunday. */
export const CINEMA_WEEKLY_UTC_DAYS = [5, 6, 0] as const;

export const CINEMA_WEEKLY_DAYS_LABEL = 'Fri–Sun';

/** Anchor date used when persisting time-only showtimes (date is ignored at runtime). */
export const CINEMA_TIME_ANCHOR_DATE = '1970-01-01';

type CinemaWeeklyDayKey = 'showFriday' | 'showSaturday' | 'showSunday';

type CinemaWeeklyScreeningSchedule = Pick<
  ICinemaFilmScreening,
  'showAt' | 'showAt2' | 'showFlexible' | 'showWeekStart'
> &
  Partial<Record<CinemaWeeklyDayKey, boolean | null>>;

const CINEMA_WEEKLY_DAY_CONFIG: Array<{
  key: CinemaWeeklyDayKey;
  day: number;
  label: string;
}> = [
  { key: 'showFriday', day: 5, label: 'Fri' },
  { key: 'showSaturday', day: 6, label: 'Sat' },
  { key: 'showSunday', day: 0, label: 'Sun' },
];

type UtcClockTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

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

const pad2 = (part: number) => String(part).padStart(2, '0');

const clockFromInstant = (instant: Date): UtcClockTime => ({
  hours: instant.getUTCHours(),
  minutes: instant.getUTCMinutes(),
  seconds: instant.getUTCSeconds(),
});

const clockKey = (clock: UtcClockTime) =>
  `${pad2(clock.hours)}:${pad2(clock.minutes)}:${pad2(clock.seconds)}`;

const parseTimeOnlyInput = (value: string): UtcClockTime | null => {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return { hours, minutes, seconds };
};

const toAnchoredIso = (clock: UtcClockTime) =>
  `${CINEMA_TIME_ANCHOR_DATE}T${pad2(clock.hours)}:${pad2(clock.minutes)}:${pad2(clock.seconds)}.000Z`;

/** Format a stored show time for `<input type="time">` (UTC wall-clock, no date). */
export const toTimeLocalValue = (value?: IDateValue | Date | null) => {
  const parsed = parseInstant(value);

  if (!parsed) {
    return '';
  }

  return `${pad2(parsed.getUTCHours())}:${pad2(parsed.getUTCMinutes())}`;
};

/** @deprecated Prefer `toTimeLocalValue` — showtimes are weekly times, not calendar dates. */
export const toDatetimeLocalValue = toTimeLocalValue;

/** Parse a time-only string (`HH:mm`) as a UTC-anchored ISO timestamp. */
export const toIsoOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const timeOnly = parseTimeOnlyInput(trimmed);
  if (timeOnly) {
    return toAnchoredIso(timeOnly);
  }

  // Legacy datetime-local / ISO values: keep the UTC clock, drop the calendar date.
  const normalized = trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
    ? `${normalized}:00`
    : normalized;
  const hasTimezone = withSeconds.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(withSeconds);
  const utcValue = hasTimezone ? withSeconds : `${withSeconds}Z`;
  const parsed = new Date(utcValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toAnchoredIso(clockFromInstant(parsed));
};

const hasExplicitWeeklyDaySelection = (screening: CinemaWeeklyScreeningSchedule) =>
  CINEMA_WEEKLY_DAY_CONFIG.some(({ key }) => screening[key] !== undefined && screening[key] !== null);

const parseWeekStartDate = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.startOf('day') : null;
};

/** Friday of the Fri–Sun block containing `date` (local calendar). */
const getLocalWeekendFriday = (date: Date) => {
  const normalized = dayjs(date).startOf('day');
  const weekday = normalized.day();

  if (weekday === 5) return normalized;
  if (weekday === 6) return normalized.subtract(1, 'day');
  if (weekday === 0) return normalized.subtract(2, 'day');

  // Mon–Thu: jump forward to this week's Friday.
  return normalized.add(5 - weekday, 'day');
};

/**
 * Resolve the screening weekend Friday:
 * 1) saved `showWeekStart` from the calendar
 * 2) otherwise the upcoming Fri–Sun weekend relative to `now`
 */
export const resolveScreeningWeekStart = (
  screening?: Pick<ICinemaFilmScreening, 'showWeekStart'> | null,
  now = new Date(),
) => {
  const saved = parseWeekStartDate(screening?.showWeekStart);
  if (saved) {
    return getLocalWeekendFriday(saved.toDate());
  }

  return getLocalWeekendFriday(now);
};

export const getScreeningWeeklyDayLabels = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
) => {
  if (!hasExplicitWeeklyDaySelection(screening) && screening.showFlexible !== true) {
    return CINEMA_WEEKLY_DAY_CONFIG.map(({ label }) => label);
  }

  const selectedDays = CINEMA_WEEKLY_DAY_CONFIG.filter(({ key }) => screening[key] !== false);

  if (!selectedDays.length) {
    return CINEMA_WEEKLY_DAY_CONFIG.map(({ label }) => label);
  }

  const weekStart = resolveScreeningWeekStart(screening, now);
  const dates = selectedDays.map(({ day }) => {
    const offset = day === 5 ? 0 : day === 6 ? 1 : 2;
    return weekStart.add(offset, 'day');
  });

  const sameMonth = dates.every(
    (date) => date.month() === dates[0].month() && date.year() === dates[0].year(),
  );

  if (sameMonth) {
    return [`${dates.map((date) => date.format('D')).join(', ')} ${dates[0].format('MMM YYYY')}`];
  }

  const sameYear = dates.every((date) => date.year() === dates[0].year());
  if (sameYear) {
    return [`${dates.map((date) => date.format('D MMM')).join(', ')} ${dates[0].format('YYYY')}`];
  }

  return [dates.map((date) => date.format('D MMM YYYY')).join(', ')];
};

export const getScreeningWeeklyDaySummary = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
) => getScreeningWeeklyDayLabels(screening, now).join(', ');

/** Unique UTC clock times from showAt / showAt2 (date portion ignored). */
export const getScreeningClockTimes = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showAt2'>,
): UtcClockTime[] => {
  const clocks = [parseInstant(screening.showAt), parseInstant(screening.showAt2)]
    .filter((value): value is Date => Boolean(value))
    .map(clockFromInstant);

  clocks.sort((a, b) => a.hours * 3600 + a.minutes * 60 + a.seconds - (b.hours * 3600 + b.minutes * 60 + b.seconds));

  return clocks.filter((clock, index) => index === 0 || clockKey(clock) !== clockKey(clocks[index - 1]));
};

const isCinemaWeeklyUtcDay = (day: number, screening?: CinemaWeeklyScreeningSchedule | null) => {
  if (!screening || !hasExplicitWeeklyDaySelection(screening)) {
    return (CINEMA_WEEKLY_UTC_DAYS as readonly number[]).includes(day);
  }

  return CINEMA_WEEKLY_DAY_CONFIG.some(
    ({ key, day: selectedDay }) => screening[key] !== false && selectedDay === day,
  );
};

export const isCinemaWeeklyScreeningDay = (
  now = new Date(),
  screening?: CinemaWeeklyScreeningSchedule | null,
) => isCinemaWeeklyUtcDay(now.getUTCDay(), screening);

/**
 * True when this screening should appear on a specific calendar day.
 * Always locked to the saved calendar weekend (`showWeekStart`), or the upcoming
 * weekend relative to real "now" when no week was saved — never every Fri–Sun forever.
 */
export const isScreeningScheduledOnDay = (
  screening: CinemaWeeklyScreeningSchedule,
  day: Date,
  now = new Date(),
) => {
  if (!isFixedTimeScreening(screening) && screening.showFlexible !== true) {
    return false;
  }

  const friday = resolveScreeningWeekStart(screening, now);
  const dayKey = dayjs(day).format('YYYY-MM-DD');

  return CINEMA_WEEKLY_DAY_CONFIG.some(({ key, day: weekday }) => {
    if (screening[key] === false) {
      return false;
    }

    const offset = weekday === 5 ? 0 : weekday === 6 ? 1 : 2;
    return friday.add(offset, 'day').format('YYYY-MM-DD') === dayKey;
  });
};

const buildOccurrence = (year: number, month: number, day: number, clock: UtcClockTime) =>
  new Date(Date.UTC(year, month, day, clock.hours, clock.minutes, clock.seconds));

/**
 * Expand showAt / showAt2 into concrete starts.
 * When a calendar weekend (`showWeekStart`) is saved, only that weekend is used.
 * Otherwise expand around `now` (Fri–Sun / Flexible).
 */
export const getScreeningStartInstants = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
  options?: { lookBehindDays?: number; lookAheadDays?: number },
) => {
  const clocks = getScreeningClockTimes(screening);
  if (!clocks.length) {
    return [];
  }

  const starts: Date[] = [];
  // Prefer the admin-selected weekend; otherwise only the upcoming weekend from `now`
  // (do not expand across every future Fri–Sun).
  const friday = resolveScreeningWeekStart(screening, now);

  CINEMA_WEEKLY_DAY_CONFIG.forEach(({ key, day }) => {
    if (screening[key] === false) {
      return;
    }

    const offset = day === 5 ? 0 : day === 6 ? 1 : 2;
    const localDay = friday.add(offset, 'day');
    clocks.forEach((clock) => {
      // Calendar day comes from the picker; show clocks remain UTC wall times.
      starts.push(
        new Date(
          Date.UTC(
            localDay.year(),
            localDay.month(),
            localDay.date(),
            clock.hours,
            clock.minutes,
            clock.seconds,
          ),
        ),
      );
    });
  });

  starts.sort((a, b) => a.getTime() - b.getTime());
  return starts;
};

/** Fallback when the video duration is not loaded yet (keeps two showtimes from merging into one window). */
const DEFAULT_SHOW_DURATION_SECONDS = 3 * 60 * 60;

const positiveDurationSeconds = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const resolveShowDurationSeconds = (mediaDurationSeconds?: number | null) =>
  positiveDurationSeconds(mediaDurationSeconds) ?? DEFAULT_SHOW_DURATION_SECONDS;

/**
 * Probe HTML5 media duration for a direct video URL.
 * Returns null for embeds/empty URLs or when metadata cannot be read.
 */
export const probeVideoDurationSeconds = (url?: string | null): Promise<number | null> => {
  const normalized = String(url || '').trim();
  if (!normalized) {
    return Promise.resolve(null);
  }

  if (/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(normalized)) {
    return Promise.resolve(null);
  }

  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      video.remove();
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(null), 12000);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      finish(positiveDurationSeconds(duration));
    };
    video.onerror = () => finish(null);
    video.src = normalized;
  });
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
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
  mediaDurationSeconds?: number | null,
) => {
  const starts = getScreeningStartInstants(screening, now);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1] || null;
    if (isShowLiveAt(start, now, mediaDurationSeconds, nextStart)) {
      return start;
    }
  }

  return null;
};

/** Next upcoming Fri/Sat/Sun showtime start, or null when unscheduled. */
export const getNextScreeningStart = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
) => {
  const nowMs = now.getTime();
  return getScreeningStartInstants(screening, now).find((start) => start.getTime() > nowMs) || null;
};

export const getScreeningShowStatus = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
  mediaDurationSeconds?: number | null,
): CinemaFilmShowStatus => {
  const clocks = getScreeningClockTimes(screening);

  if (!clocks.length) {
    return 'unscheduled';
  }

  // Live during either showAt or showAt2 playback window on Fri/Sat/Sun.
  if (getActiveScreeningStart(screening, now, mediaDurationSeconds)) {
    return 'now';
  }

  if (getNextScreeningStart(screening, now)) {
    return 'upcoming';
  }

  // Official weekends with a saved calendar week become Screened after the last show.
  // Recurring weekly rows without a week start keep looking ahead, so they stay upcoming.
  return 'past';
};

/** Pick a concrete Fri/Sat/Sun occurrence so local time reflects the correct DST offset. */
const getDisplayOccurrenceForClock = (clock: UtcClockTime, now = new Date()) => {
  const synthetic = { showAt: toAnchoredIso(clock), showAt2: null as string | null };
  const next =
    getNextScreeningStart(synthetic, now) ||
    getScreeningStartInstants(synthetic, now).find((start) => start.getTime() <= now.getTime());

  return next || buildOccurrence(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), clock);
};

/** Viewer-local clock label for a UTC time input (`HH:mm` / ISO). */
export const getLocalTimeLabelFromUtcInput = (value: string, now = new Date()) => {
  const iso = toIsoOrNull(value);
  if (!iso) {
    return null;
  }

  const clocks = getScreeningClockTimes({ showAt: iso, showAt2: null });
  if (!clocks.length) {
    return null;
  }

  const occurrence = getDisplayOccurrenceForClock(clocks[0], now);
  const localLabel = dayjs(occurrence).format(formatStr.time);
  return localLabel || null;
};

const formatStartInstantLabel = (start: Date) => {
  const utcLabel = fDateTimeFromUtc(start, formatStr.time);
  const localLabel = dayjs(start).format(formatStr.time);

  if (!utcLabel || utcLabel === 'Invalid time value' || !localLabel) {
    return null;
  }

  return `${localLabel}(${utcLabel} UTC)`;
};

/** Format: `localtime(UTC time` e.g. `7:00 pm(2:00 am UTC)`. */
const formatClockLabel = (clock: UtcClockTime, now = new Date()) => {
  const occurrence = getDisplayOccurrenceForClock(clock, now);
  return formatStartInstantLabel(occurrence);
};

/** Nearest showtime to now: active screening first, otherwise next upcoming. */
export const formatNearestScreeningTime = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
  mediaDurationSeconds?: number | null,
) => {
  const active = getActiveScreeningStart(screening, now, mediaDurationSeconds);
  if (active) {
    return formatStartInstantLabel(active);
  }

  const next = getNextScreeningStart(screening, now);
  if (next) {
    return formatStartInstantLabel(next);
  }

  const starts = getScreeningStartInstants(screening, now);
  if (!starts.length) {
    return null;
  }

  const nowMs = now.getTime();
  let nearest = starts[0];
  let nearestDiff = Math.abs(nearest.getTime() - nowMs);

  starts.forEach((start) => {
    const diff = Math.abs(start.getTime() - nowMs);
    if (diff < nearestDiff) {
      nearest = start;
      nearestDiff = diff;
    }
  });

  return formatStartInstantLabel(nearest);
};

/** Human schedule lines with concrete calendar dates + showtimes. */
export const getScreeningScheduleLabels = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
) =>
  getScreeningClockTimes(screening)
    .map((clock) => {
      const timeLabel = formatClockLabel(clock, now);
      return timeLabel ? `${getScreeningWeeklyDaySummary(screening, now)} · ${timeLabel}` : null;
    })
    .filter((label): label is string => Boolean(label));

export const formatScreeningSchedule = (
  screening: CinemaWeeklyScreeningSchedule,
  now = new Date(),
) => {
  const labels = getScreeningScheduleLabels(screening, now);

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
      return 'Screened';
    case 'unscheduled':
      return 'Open screening';
    default:
      return null;
  }
};

/** Flexible / Preview screenings are for admin playback testing only. */
export const isCinemaPreviewScreening = (
  screening?: Pick<ICinemaFilmScreening, 'showFlexible'> | null,
) => screening?.showFlexible === true;

export const filterScreeningsForViewer = <T extends Pick<ICinemaFilmScreening, 'showFlexible'>>(
  screenings: T[],
  options?: { isAdmin?: boolean },
) => {
  if (options?.isAdmin) {
    return screenings;
  }

  return screenings.filter((screening) => !isCinemaPreviewScreening(screening));
};

/** True when this screening has a fixed weekly start time (shared theater timeline). */
export const isFixedTimeScreening = (
  screening?: CinemaWeeklyScreeningSchedule | null,
) => Boolean(screening && getScreeningClockTimes(screening).length);

/** True when today (UTC) is a cinema screening day and this row has showtimes. */
export const isScreeningDayToday = (
  screening?: CinemaWeeklyScreeningSchedule | null,
  now = new Date(),
) =>
  Boolean(screening && isFixedTimeScreening(screening) && isCinemaWeeklyScreeningDay(now, screening));

/**
 * Seconds into the currently live showtime for synchronized theater playback.
 * Returns null when unscheduled, between showtimes, or outside every show window.
 */
export const getScreeningPlaybackOffsetSeconds = (
  screening: CinemaWeeklyScreeningSchedule,
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
  screening: CinemaWeeklyScreeningSchedule,
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

export const getNextFilmScreening = (
  film: Pick<ICinemaFilm, 'screenings'>,
  now = new Date(),
  mediaDurationSeconds?: number | null,
) => {
  const screenings = film.screenings || [];

  if (!screenings.length) {
    return null;
  }

  const nowShowing = screenings.find(
    (screening) => getScreeningShowStatus(screening, now, mediaDurationSeconds) === 'now',
  );
  if (nowShowing) {
    return nowShowing;
  }

  const upcoming = screenings.find(
    (screening) => getScreeningShowStatus(screening, now, mediaDurationSeconds) === 'upcoming',
  );
  if (upcoming) {
    return upcoming;
  }

  const unscheduled = screenings.find(
    (screening) => getScreeningShowStatus(screening, now, mediaDurationSeconds) === 'unscheduled',
  );
  if (unscheduled) {
    return unscheduled;
  }

  return null;
};

/** True when the film still has a live, upcoming, or open screening to show in schedule lists. */
export const isFilmOnActiveSchedule = (
  film: Pick<ICinemaFilm, 'screenings' | 'duration'>,
  now = new Date(),
  mediaDurationSeconds?: number | null,
  options?: { isAdmin?: boolean },
) => {
  const duration = mediaDurationSeconds ?? film.duration ?? null;
  const screenings = filterScreeningsForViewer(film.screenings || [], options);
  const screening = getNextFilmScreening({ screenings }, now, duration);
  if (!screening) {
    return false;
  }

  const status = getScreeningShowStatus(screening, now, duration);
  return status === 'now' || status === 'upcoming' || status === 'unscheduled';
};

export const getDefaultScreening = (
  screenings: ICinemaFilmScreeningWithFilm[],
  now = new Date(),
  mediaDurationByFilmId?: Map<number, number> | Record<number, number | null | undefined>,
) => {
  if (!screenings.length) {
    return null;
  }

  const durationFor = (filmId: number) => {
    if (!mediaDurationByFilmId) return null;
    if (mediaDurationByFilmId instanceof Map) {
      return mediaDurationByFilmId.get(filmId) ?? null;
    }
    return mediaDurationByFilmId[filmId] ?? null;
  };

  const nowShowing = screenings.find(
    (screening) =>
      getScreeningShowStatus(screening, now, durationFor(Number(screening.filmId))) === 'now',
  );
  if (nowShowing) {
    return nowShowing;
  }

  const upcoming = screenings.find(
    (screening) =>
      getScreeningShowStatus(screening, now, durationFor(Number(screening.filmId))) ===
      'upcoming',
  );
  if (upcoming) {
    return upcoming;
  }

  const unscheduled = screenings.find(
    (screening) =>
      getScreeningShowStatus(screening, now, durationFor(Number(screening.filmId))) ===
      'unscheduled',
  );
  if (unscheduled) {
    return unscheduled;
  }

  return null;
};
