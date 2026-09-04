import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureCinemaFilmsTable, type CinemaFilmCategory, normalizeCinemaCategory } from './cinema-films';

const TABLE_NAME = 'cinema_film_screenings';

export interface CinemaFilmScreening {
  id: number;
  filmId: number;
  customerId: string;
  showAt?: Date | string | null;
  showAt2?: Date | string | null;
  showFriday?: boolean | null;
  showSaturday?: boolean | null;
  showSunday?: boolean | null;
  /** When true, showtimes run any day — for admin preview before Fri–Sun scheduling. */
  showFlexible?: boolean | null;
  /** Friday (YYYY-MM-DD) of the selected screening weekend. */
  showWeekStart?: string | null;
  pricingType?: 'free' | 'paid' | null;
  price?: string | null;
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

// show_at / show_at2 store UTC clock times (date is an anchor); films screen Fri/Sat/Sun each week.
const SELECT_COLUMNS = `
  id,
  film_id as "filmId",
  customer_id as "customerId",
  CASE
    WHEN show_at IS NULL THEN NULL
    ELSE (to_char(show_at, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z')
  END as "showAt",
  CASE
    WHEN show_at2 IS NULL THEN NULL
    ELSE (to_char(show_at2, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z')
  END as "showAt2",
  show_friday as "showFriday",
  show_saturday as "showSaturday",
  show_sunday as "showSunday",
  COALESCE(show_flexible, FALSE) as "showFlexible",
  CASE
    WHEN show_week_start IS NULL THEN NULL
    ELSE to_char(show_week_start, 'YYYY-MM-DD')
  END as "showWeekStart",
  COALESCE(pricing_type, 'free') as "pricingType",
  price,
  "order",
  is_public as "isPublic",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const SELECT_WITH_FILM_COLUMNS = `
  s.id,
  s.film_id as "filmId",
  s.customer_id as "customerId",
  CASE
    WHEN s.show_at IS NULL THEN NULL
    ELSE (to_char(s.show_at, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z')
  END as "showAt",
  CASE
    WHEN s.show_at2 IS NULL THEN NULL
    ELSE (to_char(s.show_at2, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z')
  END as "showAt2",
  s.show_friday as "showFriday",
  s.show_saturday as "showSaturday",
  s.show_sunday as "showSunday",
  COALESCE(s.show_flexible, FALSE) as "showFlexible",
  CASE
    WHEN s.show_week_start IS NULL THEN NULL
    ELSE to_char(s.show_week_start, 'YYYY-MM-DD')
  END as "showWeekStart",
  COALESCE(s.pricing_type, 'free') as "pricingType",
  s.price,
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

const normalizePrice = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, 40) : null;
};

const normalizePricingType = (value: unknown): 'free' | 'paid' =>
  String(value || '').trim().toLowerCase() === 'paid' ? 'paid' : 'free';

/** Persist weekend Friday as DATE (YYYY-MM-DD). */
const normalizeWeekStartDate = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const trimmed = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
};

/** Persist UTC clock time into TIMESTAMP WITHOUT TIME ZONE (date is a fixed anchor; weekly days are applied in the app). */
const normalizeTimestamp = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const TIME_ANCHOR_DATE = '1970-01-01';
  const pad2 = (part: number) => String(part).padStart(2, '0');

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (timeOnly) {
      const hours = Number.parseInt(timeOnly[1], 10);
      const minutes = Number.parseInt(timeOnly[2], 10);
      const seconds = timeOnly[3] ? Number.parseInt(timeOnly[3], 10) : 0;
      if (
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59 &&
        seconds >= 0 &&
        seconds <= 59
      ) {
        return `${TIME_ANCHOR_DATE} ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
      }
    }
  }

  let parsed: Date;

  if (value instanceof Date) {
    parsed = value;
  } else {
    const raw = String(value).trim().replace(' ', 'T');
    const hasTimezone = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw);
    // Timezone-less values from the admin form are UTC.
    parsed = new Date(hasTimezone ? raw : `${raw}Z`);
  }

  if (Number.isNaN(parsed.getTime())) {
    throw new DatabaseError({
      code: 'INVALID_CINEMA_SCREENING_TIME',
      message: 'show time must be a valid time',
    });
  }

  // Keep UTC clock only — films screen Fri/Sat/Sun each week, not a one-off calendar date.
  return `${TIME_ANCHOR_DATE} ${pad2(parsed.getUTCHours())}:${pad2(parsed.getUTCMinutes())}:${pad2(parsed.getUTCSeconds())}`;
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
        show_at2,
        pricing_type,
        price,
        "order",
        is_public,
        created_at,
        updated_at
      )
      SELECT
        f.id,
        f.customer_id,
        f.show_at,
        f.show_at2,
        'free',
        NULL,
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

const backfillLegacyShowAt2 = async (): Promise<void> => {
  await executeQuery(
    `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = '${TABLE_NAME}'
            AND column_name = 'show_end_at'
        ) THEN
          EXECUTE '
            UPDATE ${TABLE_NAME}
            SET show_at2 = COALESCE(show_at2, show_end_at)
            WHERE show_at2 IS NULL
              AND show_end_at IS NOT NULL
          ';
        END IF;
      END $$;
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
            show_at TIMESTAMP,
            show_at2 TIMESTAMP,
            show_friday BOOLEAN NOT NULL DEFAULT TRUE,
            show_saturday BOOLEAN NOT NULL DEFAULT TRUE,
            show_sunday BOOLEAN NOT NULL DEFAULT TRUE,
            show_flexible BOOLEAN NOT NULL DEFAULT FALSE,
            pricing_type VARCHAR(20) NOT NULL DEFAULT 'free',
            price VARCHAR(40),
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

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_at2 TIMESTAMP
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_friday BOOLEAN NOT NULL DEFAULT TRUE
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_saturday BOOLEAN NOT NULL DEFAULT TRUE
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_sunday BOOLEAN NOT NULL DEFAULT TRUE
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_flexible BOOLEAN NOT NULL DEFAULT FALSE
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS show_week_start DATE
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) NOT NULL DEFAULT 'free'
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS price VARCHAR(40)
        `,
      );

      await executeQuery(
        `
          UPDATE ${TABLE_NAME}
          SET
            show_friday = COALESCE(show_friday, TRUE),
            show_saturday = COALESCE(show_saturday, TRUE),
            show_sunday = COALESCE(show_sunday, TRUE),
            show_flexible = COALESCE(show_flexible, FALSE),
            pricing_type = COALESCE(pricing_type, 'free')
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ALTER COLUMN show_at DROP NOT NULL
        `,
      );

      await backfillLegacyShowAt2();
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
  options?: { publicOnly?: boolean; allCatalog?: boolean },
): Promise<CinemaFilmScreeningWithFilm[]> {
  try {
    await ensureCinemaFilmScreeningsTable();

    const normalizedCustomerId = String(customerId || '').trim();
    const normalizedCategory = normalizeCinemaCategory(category);
    const publicOnly = options?.publicOnly === true;
    const allCatalog = options?.allCatalog === true;

    if (!normalizedCategory) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_CATEGORY',
        message: 'category must be classic or genre',
      });
    }

    if (!normalizedCustomerId && allCatalog) {
      return await queryMany<CinemaFilmScreeningWithFilm>(
        `
          SELECT ${SELECT_WITH_FILM_COLUMNS}
          FROM ${TABLE_NAME} s
          INNER JOIN cinema_films f ON f.id = s.film_id
          WHERE f.category = $1
          ORDER BY s.show_at ASC, COALESCE(s."order", 2147483647) ASC, s.id ASC
        `,
        [normalizedCategory],
      );
    }

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
            AND COALESCE(s.show_flexible, FALSE) = FALSE
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
          ${publicOnly ? 'AND s.is_public = 1 AND f.is_public = 1 AND COALESCE(s.show_flexible, FALSE) = FALSE' : ''}
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
          ${publicOnly ? 'AND is_public = 1 AND COALESCE(show_flexible, FALSE) = FALSE' : ''}
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

    const showFriday = screening.showFriday !== false;
    const showSaturday = screening.showSaturday !== false;
    const showSunday = screening.showSunday !== false;
    const showFlexible = screening.showFlexible === true;
    const pricingType = normalizePricingType(screening.pricingType ?? (screening.price != null ? 'paid' : 'free'));
    const price = pricingType === 'paid' ? normalizePrice(screening.price) : null;

    if (!showFriday && !showSaturday && !showSunday && !showFlexible) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_DAYS',
        message: 'At least one screening day must be selected',
      });
    }

    if (pricingType === 'paid') {
      const parsedPrice = Number.parseFloat(price || '');

      if (!price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_SCREENING_PRICE',
          message: 'price is required when the screening is paid',
        });
      }
    }

    const created = await queryOne<CinemaFilmScreening>(
      `
        INSERT INTO ${TABLE_NAME} (
          film_id,
          customer_id,
          show_at,
          show_at2,
          show_friday,
          show_saturday,
          show_sunday,
          show_flexible,
          show_week_start,
          pricing_type,
          price,
          "order",
          is_public,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        normalizedFilmId,
        normalizedCustomerId,
        normalizeTimestamp(screening.showAt),
        normalizeTimestamp(screening.showAt2),
        showFriday,
        showSaturday,
        showSunday,
        showFlexible,
        normalizeWeekStartDate(screening.showWeekStart),
        pricingType,
        price,
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

    const existing = await getCinemaFilmScreeningById(normalizedId);

    if (!existing) {
      throw new DatabaseError({
        code: 'CINEMA_FILM_SCREENING_NOT_FOUND',
        message: 'Cinema film screening not found',
      });
    }

    const nextShowFriday = updates.showFriday !== undefined ? Boolean(updates.showFriday) : existing.showFriday !== false;
    const nextShowSaturday =
      updates.showSaturday !== undefined ? Boolean(updates.showSaturday) : existing.showSaturday !== false;
    const nextShowSunday = updates.showSunday !== undefined ? Boolean(updates.showSunday) : existing.showSunday !== false;
    const nextShowFlexible =
      updates.showFlexible !== undefined ? Boolean(updates.showFlexible) : existing.showFlexible === true;

    if (
      nextShowFriday === false &&
      nextShowSaturday === false &&
      nextShowSunday === false &&
      nextShowFlexible === false
    ) {
      throw new DatabaseError({
        code: 'INVALID_CINEMA_SCREENING_DAYS',
        message: 'At least one screening day must be selected',
      });
    }

    const nextPricingType = normalizePricingType(
      updates.pricingType ??
        (updates.price !== undefined
          ? updates.price != null && String(updates.price).trim() !== ''
            ? 'paid'
            : 'free'
          : existing.pricingType ?? (existing.price ? 'paid' : 'free')),
    );
    const nextPrice =
      nextPricingType === 'paid'
        ? normalizePrice(updates.price !== undefined ? updates.price : existing.price)
        : null;

    if (nextPricingType === 'paid') {
      const parsedPrice = Number.parseFloat(nextPrice || '');

      if (!nextPrice || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new DatabaseError({
          code: 'INVALID_CINEMA_SCREENING_PRICE',
          message: 'price is required when the screening is paid',
        });
      }
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
      values.push(normalizeTimestamp(updates.showAt));
      paramIndex += 1;
    }

    if (updates.showAt2 !== undefined) {
      fields.push(`show_at2 = $${paramIndex}`);
      values.push(normalizeTimestamp(updates.showAt2));
      paramIndex += 1;
    }

    if (updates.showFriday !== undefined) {
      fields.push(`show_friday = $${paramIndex}`);
      values.push(Boolean(updates.showFriday));
      paramIndex += 1;
    }

    if (updates.showSaturday !== undefined) {
      fields.push(`show_saturday = $${paramIndex}`);
      values.push(Boolean(updates.showSaturday));
      paramIndex += 1;
    }

    if (updates.showSunday !== undefined) {
      fields.push(`show_sunday = $${paramIndex}`);
      values.push(Boolean(updates.showSunday));
      paramIndex += 1;
    }

    if (updates.showFlexible !== undefined) {
      fields.push(`show_flexible = $${paramIndex}`);
      values.push(Boolean(updates.showFlexible));
      paramIndex += 1;
    }

    if (updates.showWeekStart !== undefined || updates.showFlexible !== undefined) {
      const weekStartValue = normalizeWeekStartDate(
        updates.showWeekStart !== undefined ? updates.showWeekStart : existing.showWeekStart,
      );

      fields.push(`show_week_start = $${paramIndex}`);
      values.push(weekStartValue);
      paramIndex += 1;
    }

    if (updates.pricingType !== undefined || updates.price !== undefined) {
      fields.push(`pricing_type = $${paramIndex}`);
      values.push(nextPricingType);
      paramIndex += 1;

      fields.push(`price = $${paramIndex}`);
      values.push(nextPrice);
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
