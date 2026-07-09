import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'journey_diary_locations';

export interface JourneyDiaryLocation {
  id: number;
  userId?: string | null;
  journeyName?: string | null;
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  representativeImage?: string | null;
  visitedAt?: Date | string | null;
  endAt?: Date | string | null;
  notes?: string | null;
  companionUserIds?: string[] | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

const normalizeCompanionUserIds = (value?: string[] | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((id) => String(id || '').trim()).filter(Boolean))];
};

let ensureTablePromise: Promise<void> | null = null;

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = executeQuery(
      `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          journey_name VARCHAR(255),
          location VARCHAR(255) NOT NULL,
          city VARCHAR(255),
          country VARCHAR(255),
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          representative_image TEXT,
          visited_at TIMESTAMP,
          end_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
    )
      .then(() =>
        Promise.all([
          executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS journey_name VARCHAR(255)`),
          executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`),
          executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`),
          executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS representative_image TEXT`),
          executeQuery(
            `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS companion_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb`,
          ),
        ]),
      )
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
};

const LOCATION_COLUMNS = `
  id,
  user_id as "userId",
  journey_name as "journeyName",
  location,
  city,
  country,
  latitude,
  longitude,
  representative_image as "representativeImage",
  visited_at as "visitedAt",
  end_at as "endAt",
  notes,
  COALESCE(companion_user_ids, '[]'::jsonb) as "companionUserIds",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function getJourneyDiaryLocationById(id: number): Promise<JourneyDiaryLocation | null> {
  try {
    await ensureTable();

    return await queryOne<JourneyDiaryLocation>(
      `
        SELECT ${LOCATION_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_LOCATION_ERROR',
        message: `Failed to fetch journey diary location: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getAllJourneyDiaryLocations(
  userId?: string,
  limit: number = 100,
  offset: number = 0,
): Promise<JourneyDiaryLocation[]> {
  try {
    await ensureTable();

    const params: unknown[] = [];
    let query = `
      SELECT ${LOCATION_COLUMNS}
      FROM ${TABLE_NAME}
    `;

    if (userId) {
      query += ` WHERE user_id = $1`;
      params.push(userId);
      query += ` ORDER BY visited_at DESC NULLS LAST, created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY visited_at DESC NULLS LAST, created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<JourneyDiaryLocation>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_JOURNEY_DIARY_LOCATIONS_ERROR',
        message: `Failed to fetch journey diary locations: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createJourneyDiaryLocation(
  entry: Omit<JourneyDiaryLocation, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JourneyDiaryLocation> {
  try {
    await ensureTable();

    const created = await queryOne<JourneyDiaryLocation>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          journey_name,
          location,
          city,
          country,
          latitude,
          longitude,
          representative_image,
          visited_at,
          end_at,
          notes,
          companion_user_ids,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW(), NOW())
        RETURNING ${LOCATION_COLUMNS}
      `,
      [
        entry.userId || null,
        entry.journeyName || null,
        entry.location,
        entry.city || null,
        entry.country || null,
        entry.latitude ?? null,
        entry.longitude ?? null,
        entry.representativeImage || null,
        entry.visitedAt || null,
        entry.endAt || null,
        entry.notes || null,
        JSON.stringify(normalizeCompanionUserIds(entry.companionUserIds)),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_LOCATION_FAILED',
        message: 'Failed to create journey diary location: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_LOCATION_ERROR',
        message: `Failed to create journey diary location: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateJourneyDiaryLocation(
  id: number,
  entry: Partial<Omit<JourneyDiaryLocation, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<JourneyDiaryLocation> {
  try {
    await ensureTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (entry.userId !== undefined) {
      fields.push(`user_id = $${paramIndex}`);
      values.push(entry.userId || null);
      paramIndex += 1;
    }

    if (entry.journeyName !== undefined) {
      fields.push(`journey_name = $${paramIndex}`);
      values.push(entry.journeyName || null);
      paramIndex += 1;
    }

    if (entry.location !== undefined) {
      fields.push(`location = $${paramIndex}`);
      values.push(entry.location);
      paramIndex += 1;
    }

    if (entry.city !== undefined) {
      fields.push(`city = $${paramIndex}`);
      values.push(entry.city || null);
      paramIndex += 1;
    }

    if (entry.country !== undefined) {
      fields.push(`country = $${paramIndex}`);
      values.push(entry.country || null);
      paramIndex += 1;
    }

    if (entry.latitude !== undefined) {
      fields.push(`latitude = $${paramIndex}`);
      values.push(entry.latitude ?? null);
      paramIndex += 1;
    }

    if (entry.longitude !== undefined) {
      fields.push(`longitude = $${paramIndex}`);
      values.push(entry.longitude ?? null);
      paramIndex += 1;
    }

    if (entry.representativeImage !== undefined) {
      fields.push(`representative_image = $${paramIndex}`);
      values.push(entry.representativeImage || null);
      paramIndex += 1;
    }

    if (entry.visitedAt !== undefined) {
      fields.push(`visited_at = $${paramIndex}`);
      values.push(entry.visitedAt || null);
      paramIndex += 1;
    }

    if (entry.endAt !== undefined) {
      fields.push(`end_at = $${paramIndex}`);
      values.push(entry.endAt || null);
      paramIndex += 1;
    }

    if (entry.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(entry.notes || null);
      paramIndex += 1;
    }

    if (entry.companionUserIds !== undefined) {
      fields.push(`companion_user_ids = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(normalizeCompanionUserIds(entry.companionUserIds)));
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getJourneyDiaryLocationById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_JOURNEY_DIARY_LOCATION_NOT_FOUND',
          message: 'Journey diary location not found',
        });
      }
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<JourneyDiaryLocation>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${LOCATION_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_LOCATION_NOT_FOUND',
        message: 'Journey diary location not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_LOCATION_ERROR',
        message: `Failed to update journey diary location: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteJourneyDiaryLocation(id: number): Promise<boolean> {
  try {
    await ensureTable();

    const result = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return !!result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_JOURNEY_DIARY_LOCATION_ERROR',
        message: `Failed to delete journey diary location: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
