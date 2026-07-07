import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

// ----------------------------------------------------------------------

export const hasJourneyCoords = (
  entry: Pick<IJourneyDiaryLocation, 'latitude' | 'longitude'>,
): boolean =>
  typeof entry.latitude === 'number' &&
  typeof entry.longitude === 'number' &&
  !Number.isNaN(entry.latitude) &&
  !Number.isNaN(entry.longitude);

export const parseCoordInput = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

export const formatCoordInput = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';

export const toJourneyPosition = (
  entry: Pick<IJourneyDiaryLocation, 'latitude' | 'longitude'>,
): { lat: number; lng: number } | null => {
  if (!hasJourneyCoords(entry)) {
    return null;
  }

  return {
    lat: entry.latitude as number,
    lng: entry.longitude as number,
  };
};
