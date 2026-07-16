export type ICinemaFilmReservationStatus = 'reserved' | 'cancelled';

export type ICinemaFilmReservation = {
  id: number;
  screeningId: number;
  customerId: string;
  ownerCustomerId: string;
  status: ICinemaFilmReservationStatus;
  seatIds: string[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type ICinemaFilmReservationWithScreening = ICinemaFilmReservation & {
  showAt: string | Date;
  showEndAt?: string | Date | null;
  filmId: number;
  filmTitle: string;
  filmDirector?: string | null;
  filmYear?: number | null;
  filmCategory: string;
  filmVideoUrl: string;
  filmPosterImage?: string | null;
  filmDescription?: string | null;
};
