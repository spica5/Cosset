import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';
import type { JourneyDiaryMapMarker } from 'src/sections/dashboard/journey-diary/journey-diary-world-map';

import type {
  JourneyNoteDetailItem,
  JourneyPictureDetailItem,
  JourneyMemorialDetailItem,
} from './universe-landing-journey-diary-detail-dialog';

// ----------------------------------------------------------------------

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type UniverseTripFilter = 'all' | 'past' | 'upcoming';

export type UniverseJourneyTrip = {
  groupKey: string;
  country: string;
  year: number;
  month: number;
  monthLabel: string;
  journeyName?: string;
  photoCount: number;
  coverUrl: string;
  visitedAt: Date | null;
  endAt: Date | null;
  locationLabel: string;
  companionIds: string[];
  pictures: JourneyPictureDetailItem[];
  noteCount?: number;
  memorialCount?: number;
};

const parseDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTripDateRange = (visitedAt: Date | null, endAt: Date | null) => {
  if (!visitedAt) {
    return 'Dates TBD';
  }

  const start = visitedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endDate = endAt || visitedAt;
  const end = endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!endAt || visitedAt.getTime() === endAt.getTime()) {
    return visitedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return `${start} - ${end}`;
};

export { formatTripDateRange };

export function formatPictureVisitDateLabel(
  picture: Pick<JourneyPictureDetailItem, 'visitedAt' | 'journeyYear' | 'journeyMonth'>,
  trip?: Pick<UniverseJourneyTrip, 'visitedAt' | 'endAt' | 'monthLabel' | 'year'>,
) {
  const photoVisitedAt = parseDate(picture.visitedAt);
  if (photoVisitedAt) {
    return photoVisitedAt.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (trip?.visitedAt) {
    return formatTripDateRange(trip.visitedAt, trip.endAt);
  }

  if (picture.journeyMonth !== undefined && picture.journeyMonth !== null && picture.journeyYear) {
    const journeyDate = new Date(picture.journeyYear, picture.journeyMonth, 1);
    if (!Number.isNaN(journeyDate.getTime())) {
      return journeyDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  }

  if (trip) {
    return `${trip.monthLabel} ${trip.year}`;
  }

  if (picture.journeyYear) {
    return String(picture.journeyYear);
  }

  return null;
}

export function getPictureVisitTimestamp(
  picture: Pick<JourneyPictureDetailItem, 'visitedAt' | 'journeyYear' | 'journeyMonth' | 'sortOrder' | 'id'>,
  tripVisitedAt?: Date | null,
) {
  const photoVisitedAt = parseDate(picture.visitedAt);
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
}

export function sortPicturesByVisitDate<T extends Pick<JourneyPictureDetailItem, 'visitedAt' | 'journeyYear' | 'journeyMonth' | 'sortOrder' | 'id'>>(
  pictures: T[],
  tripVisitedAt?: Date | null,
) {
  return [...pictures].sort((a, b) => {
    const visitDiff =
      getPictureVisitTimestamp(b, tripVisitedAt) - getPictureVisitTimestamp(a, tripVisitedAt);

    if (visitDiff !== 0) {
      return visitDiff;
    }

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
  });
}

export function getAllCompanionIds(locations: IJourneyDiaryLocation[]) {
  return [
    ...new Set(
      locations.flatMap((location) =>
        (location.companionUserIds || []).map((id) => String(id).trim()).filter(Boolean),
      ),
    ),
  ];
}

const findLocationsForTrip = (
  groupKey: string,
  country: string,
  year: number,
  locationByGroup: Map<string, IJourneyDiaryLocation[]>,
  locations: IJourneyDiaryLocation[],
) => {
  const directMatch = locationByGroup.get(groupKey);
  if (directMatch?.length) {
    return directMatch;
  }

  const normalizedCountry = country.trim().toLowerCase();

  return locations.filter((location) => {
    const visitedAt = parseDate(location.visitedAt) || parseDate(location.createdAt);
    const locationCountry = (location.country || location.journeyName || '').trim().toLowerCase();
    const locationYear = visitedAt?.getFullYear();

    return locationCountry === normalizedCountry && locationYear === year;
  });
};

export function buildUniverseJourneyTrips(
  pictures: JourneyPictureDetailItem[],
  locations: IJourneyDiaryLocation[],
): UniverseJourneyTrip[] {
  const picturesByGroup = new Map<string, JourneyPictureDetailItem[]>();

  pictures.forEach((picture) => {
    const key =
      picture.journeyGroupKey ||
      `${picture.journeyYear}-${picture.journeyMonth}-${(picture.journeyCountry || '').toLowerCase()}`;
    const existing = picturesByGroup.get(key) || [];
    existing.push(picture);
    picturesByGroup.set(key, existing);
  });

  const sharedGroupKeys = new Set(picturesByGroup.keys());

  const locationByGroup = new Map<string, IJourneyDiaryLocation[]>();

  locations.forEach((location) => {
    const visitedAt = parseDate(location.visitedAt) || parseDate(location.createdAt);
    const year = visitedAt?.getFullYear() ?? new Date().getFullYear();
    const month = visitedAt ? visitedAt.getMonth() : 0;
    const country = location.country?.trim() || location.journeyName?.trim() || 'Journey';
    const groupKey = `${year}-${month}-${country.toLowerCase()}`;

    if (!sharedGroupKeys.has(groupKey)) {
      return;
    }

    const existing = locationByGroup.get(groupKey) || [];
    existing.push(location);
    locationByGroup.set(groupKey, existing);
  });

  const trips: UniverseJourneyTrip[] = [];

  picturesByGroup.forEach((groupPictures, groupKey) => {
    const first = groupPictures[0];
    const country = first?.journeyCountry || 'Journey';
    const preliminaryYear = first?.journeyYear ?? new Date().getFullYear();
    const matchedLocations = findLocationsForTrip(
      groupKey,
      country,
      preliminaryYear,
      locationByGroup,
      locations,
    );
    const primaryLocation = matchedLocations[0];
    const visitedAt =
      parseDate(primaryLocation?.visitedAt) ||
      parseDate(primaryLocation?.createdAt) ||
      new Date(first.journeyYear, first.journeyMonth ?? 0, 1);
    const endAt = parseDate(primaryLocation?.endAt);
    const sortedPictures = sortPicturesByVisitDate(groupPictures, visitedAt);
    const leadPicture = sortedPictures[0] || first;
    const resolvedCountry = country || primaryLocation?.country || 'Journey';
    const month = leadPicture.journeyMonth ?? visitedAt.getMonth();
    const locationLabel = [primaryLocation?.city, primaryLocation?.country || resolvedCountry]
      .filter(Boolean)
      .join(', ');

    trips.push({
      groupKey,
      country: resolvedCountry,
      year: leadPicture.journeyYear ?? visitedAt.getFullYear(),
      month,
      monthLabel: MONTH_LABELS[month] || 'JAN',
      journeyName: primaryLocation?.journeyName || undefined,
      photoCount: sortedPictures.length,
      coverUrl: sortedPictures.find((item) => item.signedImageUrl)?.signedImageUrl || '',
      visitedAt,
      endAt,
      locationLabel: locationLabel || country,
      companionIds: [
        ...new Set(matchedLocations.flatMap((location) => location.companionUserIds || [])),
      ],
      pictures: sortedPictures,
    });
  });

  return trips.sort((a, b) => {
    const aTime = a.visitedAt?.getTime() ?? 0;
    const bTime = b.visitedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export function filterUniverseTrips(trips: UniverseJourneyTrip[], filter: UniverseTripFilter) {
  if (filter === 'all') {
    return trips;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return trips.filter((trip) => {
    const tripDate = trip.visitedAt || trip.endAt;
    if (!tripDate) {
      return filter === 'past';
    }

    const normalized = new Date(tripDate);
    normalized.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return normalized.getTime() > today.getTime();
    }

    return normalized.getTime() <= today.getTime();
  });
}

export function buildJourneyStats(trips: UniverseJourneyTrip[], locations: IJourneyDiaryLocation[]) {
  const countries = new Set(trips.map((trip) => trip.country.toLowerCase()));
  const cities = new Set(
    locations.map((location) => location.city?.trim().toLowerCase()).filter(Boolean) as string[],
  );
  const photos = trips.reduce((sum, trip) => sum + trip.photoCount, 0);

  return {
    countries: countries.size,
    cities: cities.size || countries.size,
    photos,
    trips: trips.length,
  };
}

export function buildLocationVisitStats(locations: IJourneyDiaryLocation[]) {
  const countries = new Set(
    locations
      .map((location) => (location.country || location.journeyName || '').trim().toLowerCase())
      .filter(Boolean),
  );
  const cities = new Set(
    locations.map((location) => location.city?.trim().toLowerCase()).filter(Boolean) as string[],
  );

  return {
    countries: countries.size,
    cities: cities.size || countries.size,
  };
}

export function buildUniverseMapMarkers(
  locations: IJourneyDiaryLocation[],
  trips: UniverseJourneyTrip[] = [],
): JourneyDiaryMapMarker[] {
  const sharedGroupKeys = trips.length ? new Set(trips.map((trip) => trip.groupKey)) : null;

  return locations
    .filter((location) => {
      if (!location.latitude || !location.longitude) {
        return false;
      }

      if (!sharedGroupKeys) {
        return true;
      }

      const visitedAt = location.visitedAt || location.createdAt;
      const parsed = visitedAt ? new Date(visitedAt) : null;
      const year = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();
      const month = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getMonth() : 0;
      const country = location.country?.trim() || location.journeyName?.trim() || 'Journey';
      const groupKey = `${year}-${month}-${country.toLowerCase()}`;

      return sharedGroupKeys.has(groupKey);
    })
    .map((location) => ({
      id: String(location.id),
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      title: location.city || location.location || location.country || 'Visited place',
      subtitle: location.country || undefined,
    }));
}

export function getJourneyGroupKey(item: {
  journeyGroupKey?: string | null;
  journeyYear?: number;
  journeyMonth?: number;
  journeyCountry?: string | null;
}) {
  return (
    item.journeyGroupKey ||
    `${item.journeyYear}-${item.journeyMonth}-${(item.journeyCountry || '').toLowerCase()}`
  );
}

export function buildUniverseTripsForNotes(
  pictures: JourneyPictureDetailItem[],
  notes: JourneyNoteDetailItem[],
  locations: IJourneyDiaryLocation[],
) {
  const trips = buildUniverseJourneyTrips(pictures, locations).map((trip) => ({
    ...trip,
    noteCount: 0,
  }));
  const tripsByKey = new Map(trips.map((trip) => [trip.groupKey, trip]));

  notes.forEach((note) => {
    const key = getJourneyGroupKey(note);
    const existing = tripsByKey.get(key);

    if (existing) {
      existing.noteCount = (existing.noteCount || 0) + 1;
      return;
    }

    const visitedAt =
      parseDate(note.noteDate) ||
      parseDate(note.createdAt) ||
      new Date(note.journeyYear, note.journeyMonth ?? 0, 1);
    const month = note.journeyMonth ?? visitedAt.getMonth();

    tripsByKey.set(key, {
      groupKey: key,
      country: note.journeyCountry || 'Journey',
      year: note.journeyYear ?? visitedAt.getFullYear(),
      month,
      monthLabel: MONTH_LABELS[month] || 'JAN',
      photoCount: 0,
      coverUrl: note.signedImageUrl || '',
      visitedAt,
      endAt: null,
      locationLabel: note.journeyCountry || 'Journey',
      companionIds: [],
      pictures: [],
      noteCount: 1,
    });
  });

  return [...tripsByKey.values()]
    .filter((trip) => (trip.noteCount || 0) > 0)
    .sort((a, b) => {
      const aTime = a.visitedAt?.getTime() ?? 0;
      const bTime = b.visitedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
}

export function buildUniverseTripsForMemorialThings(
  pictures: JourneyPictureDetailItem[],
  memorialThings: JourneyMemorialDetailItem[],
  locations: IJourneyDiaryLocation[],
) {
  const trips = buildUniverseJourneyTrips(pictures, locations).map((trip) => ({
    ...trip,
    memorialCount: 0,
  }));
  const tripsByKey = new Map(trips.map((trip) => [trip.groupKey, trip]));

  memorialThings.forEach((item) => {
    const key = getJourneyGroupKey(item);
    const existing = tripsByKey.get(key);
    const coverUrl = item.signedImageUrl || item.signedImageUrls?.[0] || '';

    if (existing) {
      existing.memorialCount = (existing.memorialCount || 0) + 1;
      if (!existing.coverUrl && coverUrl) {
        existing.coverUrl = coverUrl;
      }
      return;
    }

    const visitedAt =
      parseDate(item.memorialDate) ||
      parseDate(item.createdAt) ||
      new Date(item.journeyYear, item.journeyMonth ?? 0, 1);
    const month = item.journeyMonth ?? visitedAt.getMonth();

    tripsByKey.set(key, {
      groupKey: key,
      country: item.journeyCountry || 'Journey',
      year: item.journeyYear ?? visitedAt.getFullYear(),
      month,
      monthLabel: MONTH_LABELS[month] || 'JAN',
      photoCount: 0,
      coverUrl,
      visitedAt,
      endAt: null,
      locationLabel: item.journeyCountry || 'Journey',
      companionIds: [],
      pictures: [],
      memorialCount: 1,
    });
  });

  return [...tripsByKey.values()]
    .filter((trip) => (trip.memorialCount || 0) > 0)
    .sort((a, b) => {
      const aTime = a.visitedAt?.getTime() ?? 0;
      const bTime = b.visitedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
}
