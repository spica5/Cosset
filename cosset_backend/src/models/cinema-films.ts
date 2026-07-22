import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'cinema_films';

export type CinemaFilmCategory = 'classic' | 'genre' | 'drama';

export interface CinemaFilm {
  id: number;
  customerId: string;
  category: CinemaFilmCategory;
  title: string;
  director?: string | null;
  year?: number | null;
  description?: string | null;
  posterImage?: string | null;
  videoUrl: string;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

const VALID_CATEGORIES = new Set<CinemaFilmCategory>(['classic', 'genre', 'drama']);

const SELECT_COLUMNS = `
  id,
  customer_id as "customerId",
  category,
  title,
  director,
  year,
  description,
  poster_image as "posterImage",
  video_url as "videoUrl",
  "order",
  is_public as "isPublic",
  created_at as "createdAt",
  updated_at as "updatedAt"
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

export const normalizeCinemaCategory = (value: unknown): CinemaFilmCategory | null => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!VALID_CATEGORIES.has(normalized as CinemaFilmCategory)) {
    return null;
  }

  return normalized as CinemaFilmCategory;
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

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            category VARCHAR(32) NOT NULL,
            title VARCHAR(255) NOT NULL,
            director VARCHAR(255),
            year INTEGER,
            description TEXT,
            poster_image TEXT,
            video_url TEXT NOT NULL,
            "order" INTEGER,
            is_public INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_cinema_films_customer_category
          ON ${TABLE_NAME} (customer_id, category, "order")
        `,
      );

      await executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS show_at TIMESTAMP`);
      await executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS show_end_at TIMESTAMP`);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export const ensureCinemaFilmsTable = ensureTable;

export async function getCinemaFilms(
  customerId: string | null | undefined,
  category: CinemaFilmCategory,
  options?: { publicOnly?: boolean },
): Promise<CinemaFilm[]> {
  try {
    await ensureTable();

    const normalizedCustomerId = String(customerId || '').trim();
    const normalizedCategory = normalizeCinemaCategory(category);
    const publicOnly = options?.publicOnly === true;

    if (!normalizedCategory) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_CATEGORY',
        message: 'category must be classic, genre, or drama',
      });
    }

    // Community catalog: all public films in the category for every customer.
    if (!normalizedCustomerId) {
      if (!publicOnly) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_FILM_CUSTOMER_ID',
          message: 'customerId is required',
        });
      }

      return await queryMany<CinemaFilm>(
        `
          SELECT ${SELECT_COLUMNS}
          FROM ${TABLE_NAME}
          WHERE category = $1
            AND is_public = 1
          ORDER BY COALESCE("order", 2147483647) ASC, created_at DESC, id DESC
        `,
        [normalizedCategory],
      );
    }

    return await queryMany<CinemaFilm>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
          AND category = $2
          ${publicOnly ? 'AND is_public = 1' : ''}
        ORDER BY COALESCE("order", 2147483647) ASC, created_at DESC, id DESC
      `,
      [normalizedCustomerId, normalizedCategory],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_CINEMA_FILMS_ERROR',
        message: `Failed to fetch cinema films: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getCinemaFilmById(id: number): Promise<CinemaFilm | null> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<CinemaFilm>(
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
        code: 'GET_CINEMA_FILM_ERROR',
        message: `Failed to fetch cinema film: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createCinemaFilm(
  film: Omit<CinemaFilm, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CinemaFilm> {
  try {
    await ensureTable();

    const normalizedCategory = normalizeCinemaCategory(film.category);
    const normalizedCustomerId = String(film.customerId || '').trim();

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    if (!normalizedCategory) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_CATEGORY',
        message: 'category must be classic, genre, or drama',
      });
    }

    const created = await queryOne<CinemaFilm>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          category,
          title,
          director,
          year,
          description,
          poster_image,
          video_url,
          "order",
          is_public,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        normalizedCustomerId,
        normalizedCategory,
        film.title,
        film.director ?? null,
        normalizeNullableInteger(film.year),
        film.description ?? null,
        film.posterImage ?? null,
        film.videoUrl,
        normalizeNullableInteger(film.order),
        normalizeIsPublic(film.isPublic),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_FILM_FAILED',
        message: 'Failed to create cinema film',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_CINEMA_FILM_ERROR',
        message: `Failed to create cinema film: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updateCinemaFilm(
  id: number,
  updates: Partial<Omit<CinemaFilm, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>,
): Promise<CinemaFilm> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_ID',
        message: 'id must be a valid integer',
      });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.category !== undefined) {
      const normalizedCategory = normalizeCinemaCategory(updates.category);
      if (!normalizedCategory) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_FILM_CATEGORY',
          message: 'category must be classic, genre, or drama',
        });
      }

      fields.push(`category = $${paramIndex}`);
      values.push(normalizedCategory);
      paramIndex += 1;
    }

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex += 1;
    }

    if (updates.director !== undefined) {
      fields.push(`director = $${paramIndex}`);
      values.push(updates.director ?? null);
      paramIndex += 1;
    }

    if (updates.year !== undefined) {
      fields.push(`year = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.year));
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.posterImage !== undefined) {
      fields.push(`poster_image = $${paramIndex}`);
      values.push(updates.posterImage ?? null);
      paramIndex += 1;
    }

    if (updates.videoUrl !== undefined) {
      fields.push(`video_url = $${paramIndex}`);
      values.push(updates.videoUrl);
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
      const existing = await getCinemaFilmById(normalizedId);
      if (!existing) {
        throw new DatabaseError({
          code: 'CINEMA_FILM_NOT_FOUND',
          message: 'Cinema film not found',
        });
      }

      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(normalizedId);

    const updated = await queryOne<CinemaFilm>(
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
        code: 'CINEMA_FILM_NOT_FOUND',
        message: 'Cinema film not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_CINEMA_FILM_ERROR',
        message: `Failed to update cinema film: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteCinemaFilm(id: number): Promise<boolean> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_FILM_ID',
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

    if (deleted?.id) {
      await executeQuery(
        `
          DELETE FROM cinema_film_screenings
          WHERE film_id = $1
        `,
        [normalizedId],
      );
    }

    return !!deleted?.id;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_CINEMA_FILM_ERROR',
        message: `Failed to delete cinema film: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
