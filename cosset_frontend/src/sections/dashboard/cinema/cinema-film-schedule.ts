import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening, ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';
import type { IDateValue } from 'src/types/common';

import { fDateTimeFromUtc } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export type CinemaFilmShowStatus = 'now' | 'upcoming' | 'past' | 'unscheduled';

const parseInstant = (value?: IDateValue | Date | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toDatetimeLocalValue = (value?: IDateValue | Date | null) => {
  const parsed = parseInstant(value);

  if (!parsed) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

export const toIsoOrNull = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const getScreeningShowStatus = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showEndAt'>,
  now = new Date(),
): CinemaFilmShowStatus => {
  const showAt = parseInstant(screening.showAt);
  const showEndAt = parseInstant(screening.showEndAt);

  if (!showAt) {
    return 'unscheduled';
  }

  if (showAt > now) {
    return 'upcoming';
  }

  if (showEndAt && showEndAt < now) {
    return 'past';
  }

  return 'now';
};

export const formatScreeningSchedule = (
  screening: Pick<ICinemaFilmScreening, 'showAt' | 'showEndAt'>,
) => {
  const showAtLabel = fDateTimeFromUtc(screening.showAt);
  const showEndAtLabel = fDateTimeFromUtc(screening.showEndAt);

  if (showAtLabel && showEndAtLabel) {
    return `${showAtLabel} – ${showEndAtLabel}`;
  }

  if (showAtLabel) {
    return showAtLabel;
  }

  return null;
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
