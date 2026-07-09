import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IJourneyCompanion = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type IJourneyDiaryLocation = {
  id: number;
  userId?: string | null;
  journeyName?: string | null;
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  representativeImage?: string | null;
  visitedAt?: IDateValue | null;
  endAt?: IDateValue | null;
  notes?: string | null;
  companionUserIds?: string[] | null;
  createdAt?: IDateValue | null;
  updatedAt?: IDateValue | null;
};

export type IJourneyDiaryLocationForm = {
  journeyName: string;
  location: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  visitedAt: string;
  endAt: string;
  notes: string;
  companionUserIds: string[];
};
