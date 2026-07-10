import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

// ----------------------------------------------------------------------

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type JourneyTimelineEntry = {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  country: string;
  journeyName?: string;
  locations: IJourneyDiaryLocation[];
};

export type JourneyPolaroidItem = {
  id: string;
  title: string;
  subtitle?: string;
  visitedAt?: string | null;
  visitDateLabel?: string | null;
  imageUrl: string;
  hasCustomImage: boolean;
  decoration: 'tape' | 'pin' | null;
  rotation: number;
  isPublic?: number | null;
};

export const formatPhotoVisitDate = (value?: string | Date | null) => {
  const parsed = parseJourneyDate(value);
  if (!parsed) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const toDateInputValue = (value?: string | Date | null) => {
  const parsed = parseJourneyDate(value);
  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getPictureVisitTimestamp = (
  picture: {
    visitedAt?: string | null;
    journeyYear?: number;
    journeyMonth?: number;
    sortOrder?: number | null;
    id: number;
  },
  tripVisitedAt?: Date | null,
) => {
  const photoVisitedAt = parseJourneyDate(picture.visitedAt);
  if (photoVisitedAt) {
    return photoVisitedAt.getTime();
  }

  if (tripVisitedAt) {
    return tripVisitedAt.getTime();
  }

  if (picture.journeyMonth !== undefined && picture.journeyMonth !== null && picture.journeyYear) {
    return new Date(picture.journeyYear, picture.journeyMonth, 1).getTime();
  }

  return 0;
};

export const sortPicturesByVisitDate = <
  T extends {
    visitedAt?: string | null;
    journeyYear?: number;
    journeyMonth?: number;
    sortOrder?: number | null;
    id: number;
  },
>(
  pictures: T[],
  tripVisitedAt?: Date | null,
) =>
  [...pictures].sort((a, b) => {
    const visitDiff =
      getPictureVisitTimestamp(b, tripVisitedAt) - getPictureVisitTimestamp(a, tripVisitedAt);

    if (visitDiff !== 0) {
      return visitDiff;
    }

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
  });

export const parseJourneyDate = (value?: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeCountryKey = (country?: string | null) =>
  (country || 'Unknown').trim().toLowerCase();

export const buildJourneyTimeline = (locations: IJourneyDiaryLocation[]) => {
  const groups = new Map<string, JourneyTimelineEntry>();

  locations.forEach((location) => {
    const visitedAt = parseJourneyDate(location.visitedAt) || parseJourneyDate(location.createdAt);
    const year = visitedAt?.getFullYear() ?? new Date().getFullYear();
    const month = visitedAt ? visitedAt.getMonth() : 0;
    const country = location.country?.trim() || location.journeyName?.trim() || 'Journey';
    const groupKey = `${year}-${month}-${country.toLowerCase()}`;

    const existing = groups.get(groupKey);

    if (existing) {
      existing.locations.push(location);
      return;
    }

    groups.set(groupKey, {
      id: groupKey,
      year,
      month,
      monthLabel: MONTH_LABELS[month] || 'JAN',
      country,
      journeyName: location.journeyName || undefined,
      locations: [location],
    });
  });

  const entries = [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }

    if (a.month !== b.month) {
      return b.month - a.month;
    }

    return a.country.localeCompare(b.country);
  });

  const years = [...new Set(entries.map((entry) => entry.year))].sort((a, b) => b - a);

  return { entries, years };
};

export const getLocationImageUrl = (location: IJourneyDiaryLocation) => {
  const seed = encodeURIComponent(
    [location.city, location.location, location.country].filter(Boolean).join('-') || 'journey',
  );

  return `https://picsum.photos/seed/${seed}/420/320`;
};

export const toPolaroidItemsFromPictures = (
  pictures: Array<{
    id: number;
    caption?: string | null;
    imageKey: string;
    journeyCountry?: string | null;
    visitedAt?: string | null;
    isPublic?: number | null;
  }>,
  resolvedUrls: Record<string, string>,
): JourneyPolaroidItem[] =>
  pictures.map((picture, index) => ({
    id: String(picture.id),
    title: picture.caption?.trim() || `Memory ${index + 1}`,
    subtitle: picture.journeyCountry || undefined,
    visitedAt: picture.visitedAt || null,
    visitDateLabel: formatPhotoVisitDate(picture.visitedAt),
    imageUrl: resolvedUrls[picture.imageKey] || '',
    hasCustomImage: Boolean(resolvedUrls[picture.imageKey]),
    decoration: (['tape', 'pin', null, null, 'tape', 'pin'] as const)[index % 6],
    rotation: ((index % 5) - 2) * 1.4,
    isPublic: picture.isPublic,
  }));
