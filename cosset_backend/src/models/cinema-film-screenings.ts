import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureCinemaFilmsTable, type CinemaFilmCategory, normalizeCinemaCategory } from './cinema-films';

const TABLE_NAME = 'cinema_film_screenings';

export interface CinemaFilmScreening {
  id: number;
  filmId: number;
  customerId: string;
  showAt: Date | string;
  showEndAt?: Date | string | null;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface CinemaFilmScreeningWithFilm extends CinemaFilmScreening {
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
  film_id as "filmId",
  customer_id as "customerId",
  show_at as "showAt",
  show_end_at as "showEndAt",
  "order",
  is_public as "isPublic",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const SELECT_WITH_FILM_COLUMNS = `
  s.id,
  s.film_id as "filmId",
  s.customer_id as "customerId",
  s.show_at as "showAt",
  s.show_end_at as "showEndAt",
  s."order",
  s.is_public as "isPublic",
  s.created_at as "createdAt",
  s.updated_at as "updatedAt",
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

const normalizeNullableInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseInteger(value);
};

const normalizeTimestamp = (value: unknown, required = false): string | null => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_TIME',
        message: 'showAt is required',
      });
    }

    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_TIME',
        message: 'showAt must be a valid datetime',
      });
    }

    return value.toISOString();
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new DatabaseError({
      code: 'INVALID_CINEMA_SCREENING_TIME',
      message: 'showAt must be a valid datetime',
    });
  }

  return parsed.toISOString();
};

const normalizeIsPublic = (value: unknown): 0 | 1 => {
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true' ? 1 : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return 1;
};

const migrateLegacyFilmSchedules = async (): Promise<void> => {
  await executeQuery(
    `
      INSERT INTO ${TABLE_NAME} (
        film_id,
        customer_id,
        show_at,
        show_end_at,
        "order",
        is_public,
        created_at,
        updated_at
      )
      SELECT
        f.id,
        f.customer_id,
        f.show_at,
        f.show_end_at,
        f."order",
        f.is_public,
        NOW(),
        NOW()
      FROM cinema_films f
      WHERE f.show_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM ${TABLE_NAME} s
          WHERE s.film_id = f.id
        )
    `,
  );
};

export const ensureCinemaFilmScreeningsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await ensureCinemaFilmsTable();

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            film_id BIGINT NOT NULL,
            customer_id VARCHAR(255) NOT NULL,
            show_at TIMESTAMP NOT NULL,
            show_end_at TIMESTAMP,
            "order" INTEGER,
            is_public INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_cinema_film_screenings_film
          ON ${TABLE_NAME} (film_id, show_at)
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_cinema_film_screenings_customer_show
          ON ${TABLE_NAME} (customer_id, show_at)
        `,
      );

      await migrateLegacyFilmSchedules();
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function getCinemaFilmScreeningsByCategory(
  customerId: string | null | undefined,
  category: CinemaFilmCategory,
  options?: { publicOnly?: boolean },
): Promise<CinemaFilmScreeningWithFilm[]> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedCustomerId = String(customerId || '').trim();
    const normalizedCategory = normalizeCinemaCategory(category);
    const publicOnly = options?.publicOnly === true;

    if (!normalizedCategory) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_CATEGORY',
        message: 'category must be classic, genre, or drama',
      });
    }

    // Community catalog: all public screenings in the category for every customer.
    if (!normalizedCustomerId) {
      if (!publicOnly) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_SCREENING_CUSTOMER_ID',
          message: 'customerId is required',
        });
      }

      return await queryMany<CinemaFilmScreeningWithFilm>(
        `
          SELECT ${SELECT_WITH_FILM_COLUMNS}
          FROM ${TABLE_NAME} s
          INNER JOIN cinema_films f ON f.id = s.film_id
          WHERE f.category = $1
            AND s.is_public = 1
            AND f.is_public = 1
          ORDER BY s.show_at ASC, COALESCE(s."order", 2147483647) ASC, s.id ASC
        `,
        [normalizedCategory],
      );
    }

    return await queryMany<CinemaFilmScreeningWithFilm>(
      `
        SELECT ${SELECT_WITH_FILM_COLUMNS}
        FROM ${TABLE_NAME} s
        INNER JOIN cinema_films f ON f.id = s.film_id
        WHERE s.customer_id = $1
          AND f.category = $2
          ${publicOnly ? 'AND s.is_public = 1 AND f.is_public = 1' : ''}
        ORDER BY s.show_at ASC, COALESCE(s."order", 2147483647) ASC, s.id ASC
      `,
      [normalizedCustomerId, normalizedCategory],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_CINEMA_FILM_SCREENINGS_ERROR',
        message: `Failed to fetch cinema film screenings: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getCinemaFilmScreeningsByFilmIds(
  filmIds: number[],
  options?: { publicOnly?: boolean },
): Promise<CinemaFilmScreening[]> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedFilmIds = filmIds
      .map((id) => parseInteger(id))
      .filter((id): id is number => id !== null);

    if (!normalizedFilmIds.length) {
      return [];
    }

    const publicOnly = options?.publicOnly === true;

    return await queryMany<CinemaFilmScreening>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE film_id = ANY($1::bigint[])
          ${publicOnly ? 'AND is_public = 1' : ''}
        ORDER BY show_at ASC, COALESCE("order", 2147483647) ASC, id ASC
      `,
      [normalizedFilmIds],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_CINEMA_FILM_SCREENINGS_BY_FILM_IDS_ERROR',
        message: `Failed to fetch cinema film screenings: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getCinemaFilmScreeningById(id: number): Promise<CinemaFilmScreening | null> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<CinemaFilmScreening>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_CINEMA_FILM_SCREENING_ERROR',
        message: `Failed to fetch cinema film screening: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createCinemaFilmScreening(
  screening: Omit<CinemaFilmScreening, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CinemaFilmScreening> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedFilmId = parseInteger(screening.filmId);
    const normalizedCustomerId = String(screening.customerId || '').trim();

    if (normalizedFilmId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_FILM_ID',
        message: 'filmId is required',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    const created = await queryOne<CinemaFilmScreening>(
      `
        INSERT INTO ${TABLE_NAME} (
          film_id,
          customer_id,
          show_at,
          show_end_at,
          "order",
          is_public,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        normalizedFilmId,
        normalizedCustomerId,
        normalizeTimestamp(screening.showAt, true),
        normalizeTimestamp(screening.showEndAt),
        normalizeNullableInteger(screening.order),
        normalizeIsPublic(screening.isPublic),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_FILM_SCREENING_FAILED',
        message: 'Failed to create cinema film screening',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_FILM_SCREENING_ERROR',
        message: `Failed to create cinema film screening: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updateCinemaFilmScreening(
  id: number,
  updates: Partial<Omit<CinemaFilmScreening, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>,
): Promise<CinemaFilmScreening> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_ID',
        message: 'id must be a valid integer',
      });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.filmId !== undefined) {
      const normalizedFilmId = parseInteger(updates.filmId);

      if (normalizedFilmId === null) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_SCREENING_FILM_ID',
          message: 'filmId must be a valid integer',
        });
      }

      fields.push(`film_id = $${paramIndex}`);
      values.push(normalizedFilmId);
      paramIndex += 1;
    }

    if (updates.showAt !== undefined) {
      fields.push(`show_at = $${paramIndex}`);
      values.push(normalizeTimestamp(updates.showAt, true));
      paramIndex += 1;
    }

    if (updates.showEndAt !== undefined) {
      fields.push(`show_end_at = $${paramIndex}`);
      values.push(normalizeTimestamp(updates.showEndAt));
      paramIndex += 1;
    }

    if (updates.order !== undefined) {
      fields.push(`"order" = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.order));
      paramIndex += 1;
    }

    if (updates.isPublic !== undefined) {
      fields.push(`is_public = $${paramIndex}`);
      values.push(normalizeIsPublic(updates.isPublic));
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getCinemaFilmScreeningById(normalizedId);

      if (!existing) {
        throw new DatabaseError({
          code: 'CINEMA_FILM_SCREENING_NOT_FOUND',
          message: 'Cinema film screening not found',
        });
      }

      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(normalizedId);

    const updated = await queryOne<CinemaFilmScreening>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${SELECT_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'CINEMA_FILM_SCREENING_NOT_FOUND',
        message: 'Cinema film screening not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_CINEMA_FILM_SCREENING_ERROR',
        message: `Failed to update cinema film screening: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteCinemaFilmScreening(id: number): Promise<boolean> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_ID',
        message: 'id must be a valid integer',
      });
    }

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [normalizedId],
    );

    return !!deleted?.id;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_CINEMA_FILM_SCREENING_ERROR',
        message: `Failed to delete cinema film screening: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteCinemaFilmScreeningsByFilmId(filmId: number): Promise<void> {
  await ensureCinemaFilmScreeningsTable();

  const normalizedFilmId = parseInteger(filmId);

  if (normalizedFilmId === null) {
    return;
  }

  await executeQuery(
    `
      DELETE FROM ${TABLE_NAME}
      WHERE film_id = $1
    `,
    [normalizedFilmId],
  );
}
