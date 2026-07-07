// ----------------------------------------------------------------------

export type IJourneyDiaryNote = {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  pictureId?: number | null;
  imageKey?: string | null;
  title: string;
  content: string;
  noteDate?: string | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
