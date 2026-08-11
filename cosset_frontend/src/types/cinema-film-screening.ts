export type ICinemaFilmScreening = {
  id: number;
  filmId: number;
  customerId: string;
  showAt?: string | Date | null;
  showAt2?: string | Date | null;
  showFriday?: boolean | null;
  showSaturday?: boolean | null;
  showSunday?: boolean | null;
  /** When true, showtimes run any day — for admin preview before Fri–Sun scheduling. */
  showFlexible?: boolean | null;
  pricingType?: 'free' | 'paid' | null;
  price?: string | null;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type ICinemaFilmScreeningWithFilm = ICinemaFilmScreening & {
  filmTitle: string;
  filmDirector?: string | null;
  filmYear?: number | null;
  filmCategory: string;
  filmVideoUrl: string;
  filmPosterImage?: string | null;
  filmDescription?: string | null;
};
