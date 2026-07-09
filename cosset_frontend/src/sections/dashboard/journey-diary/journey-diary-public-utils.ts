// ----------------------------------------------------------------------

export type JourneyVisibility = 0 | 1;

export const isPublicJourneyItem = (isPublic: unknown): boolean => {
  if (typeof isPublic === 'number') {
    return isPublic === 1;
  }

  if (typeof isPublic === 'string') {
    const normalized = isPublic.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true';
  }

  if (typeof isPublic === 'boolean') {
    return isPublic;
  }

  return false;
};

export const toJourneyVisibility = (isPublic: unknown): JourneyVisibility =>
  isPublicJourneyItem(isPublic) ? 1 : 0;
