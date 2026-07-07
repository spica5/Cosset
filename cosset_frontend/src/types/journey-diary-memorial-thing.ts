// ----------------------------------------------------------------------

export type JourneyMemorialThingCategory =
  | 'scenery'
  | 'food'
  | 'culture'
  | 'people'
  | 'special_events';

export type IJourneyMemorialThingImage = {
  id: number;
  memorialThingId: number;
  imageKey: string;
  sortOrder?: number | null;
  createdAt?: string | null;
};

export type IJourneyMemorialThing = {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  category: JourneyMemorialThingCategory;
  title: string;
  description?: string | null;
  pictureId?: number | null;
  imageKey?: string | null;
  images?: IJourneyMemorialThingImage[];
  memorialDate?: string | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
