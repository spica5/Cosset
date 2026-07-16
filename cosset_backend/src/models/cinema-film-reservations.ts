import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import {
  getCinemaFilmScreeningById,
  ensureCinemaFilmScreeningsTable,
} from './cinema-film-screenings';
import {
  ensureCinemaFilmsTable,
  normalizeCinemaCategory,
  type CinemaFilmCategory,
} from './cinema-films';

const TABLE_NAME = 'cinema_film_reservations';

export type CinemaFilmReservationStatus = 'reserved' | 'cancelled';

export interface CinemaFilmReservation {
  id: number;
  screeningId: number;
  customerId: string;
  ownerCustomerId: string;
  status: CinemaFilmReservationStatus;
  seatIds: string[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface CinemaFilmReservationWithScreening extends CinemaFilmReservation {
  showAt: Date | string;
  showEndAt?: Date | string | null;
  filmId: number;
  filmTitle: string;
  filmDirector?: string | null;
  filmYear?: number | null;
  filmCategory: CinemaFilmCategory;
  filmVideoUrl: string;
  filmPosterImage?: string | null;
  filmDescription?: string | null;
}

const SELECT_COLUMNS = `
  id,
  screening_id as "screeningId",
  customer_id as "customerId",
  owner_customer_id as "ownerCustomerId",
  status,
  COALESCE(seat_ids, '[]'::jsonb) as "seatIds",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const SELECT_WITH_SCREENING_COLUMNS = `
  r.id,
  r.screening_id as "screeningId",
  r.customer_id as "customerId",
  r.owner_customer_id as "ownerCustomerId",
  r.status,
  COALESCE(r.seat_ids, '[]'::jsonb) as "seatIds",
  r.created_at as "createdAt",
  r.updated_at as "updatedAt",
  s.show_at as "showAt",
  s.show_end_at as "showEndAt",
  s.film_id as "filmId",
  f.title as "filmTitle",
  f.director as "filmDirector",
  f.year as "filmYear",
  f.category as "filmCategory",
  f.video_url as "filmVideoUrl",
  f.poster_image as "filmPosterImage",
  f.description as "filmDescription"
`;

let ensureTablePromise: Promise<void> | null = null;

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeSeatIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  value.forEach((item) => {
    const seatId = String(item || '').trim().toUpperCase();
    if (seatId) {
      unique.add(seatId);
    }
  });

  return Array.from(unique);
};

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await ensureCinemaFilmsTable();
      await ensureCinemaFilmScreeningsTable();

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            screening_id BIGINT NOT NULL,
            customer_id VARCHAR(255) NOT NULL,
            owner_customer_id VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'reserved',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_cinema_film_reservation_status CHECK (
              status IN ('reserved', 'cancelled')
            )
          )
        `,
      );

      await executeQuery(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS uniq_cinema_film_reservation_active
          ON ${TABLE_NAME} (screening_id, customer_id)
          WHERE status = 'reserved'
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_cinema_film_reservations_customer
          ON ${TABLE_NAME} (customer_id, status, created_at DESC)
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_cinema_film_reservations_owner_category
          ON ${TABLE_NAME} (owner_customer_id, status)
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS seat_ids JSONB NOT NULL DEFAULT '[]'::jsonb
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export const ensureCinemaFilmReservationsTable = ensureTable;

export async function createCinemaFilmReservation(input: {
  screeningId: number;
  customerId: string;
  seatIds?: string[];
}): Promise<CinemaFilmReservationWithScreening> {
  try {
    await ensureTable();

    const screeningId = parseInteger(input.screeningId);
    const customerId = String(input.customerId || '').trim();
    const seatIds = normalizeSeatIds(input.seatIds);

    if (!screeningId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_SCREENING',
        message: 'screeningId is required',
      });
    }

    if (!customerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_CUSTOMER',
        message: 'customerId is required',
      });
    }

    if (!seatIds.length) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_SEATS',
        message: 'A seat is required',
      });
    }

    if (seatIds.length > 1) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_SEATS',
        message: 'Only one seat can be reserved',
      });
    }

    const screening = await getCinemaFilmScreeningById(screeningId);

    if (!screening) {
      throw new DatabaseError({
        code: 'CINEMA_RESERVATION_SCREENING_NOT_FOUND',
        message: 'Screening not found',
      });
    }

    const existing = await queryOne<CinemaFilmReservation>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE screening_id = $1
          AND customer_id = $2
          AND status = 'reserved'
        LIMIT 1
      `,
      [screeningId, customerId],
    );

    if (existing) {
      throw new DatabaseError({
        code: 'CINEMA_RESERVATION_EXISTS',
        message: 'This screening is already reserved',
      });
    }

    const created = await queryOne<CinemaFilmReservation>(
      `
        INSERT INTO ${TABLE_NAME} (
          screening_id,
          customer_id,
          owner_customer_id,
          status,
          seat_ids
        )
        VALUES ($1, $2, $3, 'reserved', $4::jsonb)
        RETURNING ${SELECT_COLUMNS}
      `,
      [screeningId, customerId, screening.customerId, JSON.stringify(seatIds)],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_RESERVATION_ERROR',
        message: 'Failed to create reservation',
      });
    }

    const detailed = await getCinemaFilmReservationById(created.id);

    if (!detailed) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_RESERVATION_ERROR',
        message: 'Failed to load created reservation',
      });
    }

    return detailed;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'CREATE_CINEMA_RESERVATION_ERROR',
      message: `Failed to create cinema reservation: ${(error as Error).message}`,
    });
  }
}

export async function getCinemaFilmReservationById(
  id: number,
): Promise<CinemaFilmReservationWithScreening | null> {
  await ensureTable();

  const reservationId = parseInteger(id);

  if (!reservationId) {
    return null;
  }

  return queryOne<CinemaFilmReservationWithScreening>(
    `
      SELECT ${SELECT_WITH_SCREENING_COLUMNS}
      FROM ${TABLE_NAME} r
      INNER JOIN cinema_film_screenings s ON s.id = r.screening_id
      INNER JOIN cinema_films f ON f.id = s.film_id
      WHERE r.id = $1
      LIMIT 1
    `,
    [reservationId],
  );
}

export async function listCinemaFilmReservations(options: {
  customerId: string;
  ownerCustomerId?: string | null;
  category?: CinemaFilmCategory | null;
  status?: CinemaFilmReservationStatus | 'all';
}): Promise<CinemaFilmReservationWithScreening[]> {
  try {
    await ensureTable();

    const customerId = String(options.customerId || '').trim();
    const ownerCustomerId = String(options.ownerCustomerId || '').trim();
    const category = options.category ? normalizeCinemaCategory(options.category) : null;
    const status = options.status || 'reserved';

    if (!customerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_CUSTOMER',
        message: 'customerId is required',
      });
    }

    const params: unknown[] = [customerId];
    const filters = [`r.customer_id = $1`];

    if (status !== 'all') {
      params.push(status);
      filters.push(`r.status = $${params.length}`);
    }

    if (ownerCustomerId) {
      params.push(ownerCustomerId);
      filters.push(`r.owner_customer_id = $${params.length}`);
    }

    if (category) {
      params.push(category);
      filters.push(`f.category = $${params.length}`);
    }

    return await queryMany<CinemaFilmReservationWithScreening>(
      `
        SELECT ${SELECT_WITH_SCREENING_COLUMNS}
        FROM ${TABLE_NAME} r
        INNER JOIN cinema_film_screenings s ON s.id = r.screening_id
        INNER JOIN cinema_films f ON f.id = s.film_id
        WHERE ${filters.join(' AND ')}
        ORDER BY s.show_at ASC, r.created_at DESC, r.id DESC
      `,
      params,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'LIST_CINEMA_RESERVATIONS_ERROR',
      message: `Failed to list cinema reservations: ${(error as Error).message}`,
    });
  }
}

export async function updateCinemaFilmReservationSeats(
  id: number,
  customerId: string,
  seatIdsInput: unknown,
): Promise<CinemaFilmReservationWithScreening | null> {
  try {
    await ensureTable();

    const reservationId = parseInteger(id);
    const normalizedCustomerId = String(customerId || '').trim();
    const seatIds = normalizeSeatIds(seatIdsInput);

    if (!reservationId || !normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION',
        message: 'Reservation id and customerId are required',
      });
    }

    if (!seatIds.length) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_SEATS',
        message: 'A seat is required',
      });
    }

    if (seatIds.length > 1) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION_SEATS',
        message: 'Only one seat can be reserved',
      });
    }

    const existing = await getCinemaFilmReservationById(reservationId);

    if (!existing) {
      return null;
    }

    if (existing.customerId !== normalizedCustomerId) {
      throw new DatabaseError({
        code: 'CINEMA_RESERVATION_FORBIDDEN',
        message: 'You can only update your own reservations',
      });
    }

    if (existing.status !== 'reserved') {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION',
        message: 'Only active reservations can update seats',
      });
    }

    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET seat_ids = $2::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [reservationId, JSON.stringify(seatIds)],
    );

    return await getCinemaFilmReservationById(reservationId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'UPDATE_CINEMA_RESERVATION_SEATS_ERROR',
      message: `Failed to update cinema reservation seats: ${(error as Error).message}`,
    });
  }
}

export async function cancelCinemaFilmReservation(
  id: number,
  customerId: string,
): Promise<CinemaFilmReservationWithScreening | null> {
  try {
    await ensureTable();

    const reservationId = parseInteger(id);
    const normalizedCustomerId = String(customerId || '').trim();

    if (!reservationId || !normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_RESERVATION',
        message: 'Reservation id and customerId are required',
      });
    }

    const existing = await getCinemaFilmReservationById(reservationId);

    if (!existing) {
      return null;
    }

    if (existing.customerId !== normalizedCustomerId) {
      throw new DatabaseError({
        code: 'CINEMA_RESERVATION_FORBIDDEN',
        message: 'You can only cancel your own reservations',
      });
    }

    if (existing.status === 'cancelled') {
      return existing;
    }

    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [reservationId],
    );

    return await getCinemaFilmReservationById(reservationId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'CANCEL_CINEMA_RESERVATION_ERROR',
      message: `Failed to cancel cinema reservation: ${(error as Error).message}`,
    });
  }
}

