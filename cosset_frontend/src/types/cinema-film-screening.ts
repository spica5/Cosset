export type ICinemaFilmScreening = {
  id: number;
  filmId: number;
  customerId: string;
  showAt: string | Date;
  showEndAt?: string | Date | null;
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
