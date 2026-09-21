import type { CinemaFilmScreening } from 'src/models/cinema-film-screenings';

// ----------------------------------------------------------------------

type WeeklyDayKey = 'showFriday' | 'showSaturday' | 'showSunday';

const WEEKLY_DAY_CONFIG: Array<{ key: WeeklyDayKey; day: number }> = [
  { key: 'showFriday', day: 5 },
  { key: 'showSaturday', day: 6 },
  { key: 'showSunday', day: 0 },
];

type UtcClock = { hours: number; minutes: number; seconds: number };

const parseInstant = (value?: Date | string | null): Date | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clockFromInstant = (instant: Date): UtcClock => ({
  hours: instant.getUTCHours(),
  minutes: instant.getUTCMinutes(),
  seconds: instant.getUTCSeconds(),
});

const getScreeningClockTimes = (
  screening: Pick<CinemaFilmScreening, 'showAt' | 'showAt2'>,
): UtcClock[] => {
  const clocks = [parseInstant(screening.showAt), parseInstant(screening.showAt2)]
    .filter((value): value is Date => Boolean(value))
    .map(clockFromInstant);

  const key = (clock: UtcClock) =>
    `${clock.hours}:${clock.minutes}:${clock.seconds}`;

  clocks.sort(
    (a, b) =>
      a.hours * 3600 + a.minutes * 60 + a.seconds - (b.hours * 3600 + b.minutes * 60 + b.seconds),
  );

  return clocks.filter((clock, index) => index === 0 || key(clock) !== key(clocks[index - 1]));
};

const parseWeekStartDate = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Friday of the Fri–Sun block containing `date` (UTC calendar). */
const getWeekendFriday = (date: Date) => {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const weekday = normalized.getUTCDay();

  if (weekday === 5) return normalized;
  if (weekday === 6) {
    normalized.setUTCDate(normalized.getUTCDate() - 1);
    return normalized;
  }
  if (weekday === 0) {
    normalized.setUTCDate(normalized.getUTCDate() - 2);
    return normalized;
  }

  normalized.setUTCDate(normalized.getUTCDate() + (5 - weekday));
  return normalized;
};

const resolveScreeningWeekStart = (
  screening: Pick<CinemaFilmScreening, 'showWeekStart'>,
  now: Date,
) => {
  const saved = parseWeekStartDate(screening.showWeekStart);
  if (saved) return getWeekendFriday(saved);
  return getWeekendFriday(now);
};

/**
 * Expand official Fri–Sun showtimes into concrete UTC start instants for the
 * screening weekend (saved week or upcoming weekend from `now`).
 */
export function getScreeningStartInstants(
  screening: Pick<
    CinemaFilmScreening,
    'showAt' | 'showAt2' | 'showFriday' | 'showSaturday' | 'showSunday' | 'showFlexible' | 'showWeekStart'
  >,
  now = new Date(),
): Date[] {
  if (screening.showFlexible === true) {
    return [];
  }

  const clocks = getScreeningClockTimes(screening);
  if (!clocks.length) return [];

  const friday = resolveScreeningWeekStart(screening, now);
  const starts: Date[] = [];

  WEEKLY_DAY_CONFIG.forEach(({ key, day }) => {
    if (screening[key] === false) return;

    const offset = day === 5 ? 0 : day === 6 ? 1 : 2;
    const localDay = new Date(friday);
    localDay.setUTCDate(friday.getUTCDate() + offset);

    clocks.forEach((clock) => {
      starts.push(
        new Date(
          Date.UTC(
            localDay.getUTCFullYear(),
            localDay.getUTCMonth(),
            localDay.getUTCDate(),
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
}

/** Upcoming starts within the next `withinMs` window (default 24h). */
export function getUpcomingScreeningStartsWithin(
  screening: Pick<
    CinemaFilmScreening,
    'showAt' | 'showAt2' | 'showFriday' | 'showSaturday' | 'showSunday' | 'showFlexible' | 'showWeekStart'
  >,
  now = new Date(),
  withinMs = 24 * 60 * 60 * 1000,
): Date[] {
  const end = now.getTime() + withinMs;
  return getScreeningStartInstants(screening, now).filter((start) => {
    const t = start.getTime();
    return t >= now.getTime() && t <= end;
  });
}

export function formatStartsInLabel(start: Date, now = new Date()): string {
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 15 * 60 * 1000) return 'starting soon';

  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours <= 1) return 'in about 1 hour';
  if (hours < 24) return `in about ${hours} hours`;
  return 'within 24 hours';
}
