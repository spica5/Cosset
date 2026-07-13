import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';

export type ICinemaFilm = {
  id: number;
  customerId: string;
  category: CinemaCategory;
  title: string;
  director?: string | null;
  year?: number | null;
  description?: string | null;
  posterImage?: string | null;
  videoUrl: string;
  order?: number | null;
  isPublic?: number | null;
  screenings?: ICinemaFilmScreening[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};
