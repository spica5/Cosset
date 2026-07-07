// ----------------------------------------------------------------------

export type IJourneyRepresentativePicture = {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  caption?: string | null;
  imageKey: string;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
