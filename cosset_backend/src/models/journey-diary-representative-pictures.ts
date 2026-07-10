import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'journey_diary_representative_pictures';

export interface JourneyDiaryRepresentativePicture {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  caption?: string | null;
  imageKey: string;
  sortOrder?: number | null;
  isPublic?: number | null;
  visitedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

let ensureTablePromise: Promise<void> | null = null;

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = executeQuery(
      `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          journey_group_key VARCHAR(255) NOT NULL,
          journey_year INT NOT NULL,
          journey_month INT NOT NULL,
          journey_country VARCHAR(255) NOT NULL,
          caption VARCHAR(255),
          image_key TEXT NOT NULL,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
    )
      .then(() =>
        executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS is_public INT DEFAULT 0`),
      )
      .then(() =>
        executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP`),
      )
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
};

const PICTURE_COLUMNS = `
  id,
  user_id as "userId",
  journey_group_key as "journeyGroupKey",
  journey_year as "journeyYear",
  journey_month as "journeyMonth",
  journey_country as "journeyCountry",
  caption,
  image_key as "imageKey",
  sort_order as "sortOrder",
  is_public as "isPublic",
  visited_at as "visitedAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function getJourneyDiaryRepresentativePictureById(
  id: number,
): Promise<JourneyDiaryRepresentativePicture | null> {
  try {
    await ensureTable();

    return await queryOne<JourneyDiaryRepresentativePicture>(
      `
        SELECT ${PICTURE_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_ERROR',
        message: `Failed to fetch journey representative picture: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getJourneyDiaryRepresentativePictures(
  userId?: string,
  journeyGroupKey?: string,
  limit: number = 200,
  offset: number = 0,
): Promise<JourneyDiaryRepresentativePicture[]> {
  try {
    await ensureTable();

    const params: unknown[] = [];
    let query = `
      SELECT ${PICTURE_COLUMNS}
      FROM ${TABLE_NAME}
    `;
    const conditions: string[] = [];

    if (userId) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(userId);
    }

    if (journeyGroupKey) {
      conditions.push(`journey_group_key = $${params.length + 1}`);
      params.push(journeyGroupKey);
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY sort_order ASC, created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    return await queryMany<JourneyDiaryRepresentativePicture>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_REPRESENTATIVE_PICTURES_ERROR',
        message: `Failed to fetch journey representative pictures: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createJourneyDiaryRepresentativePicture(
  picture: Omit<JourneyDiaryRepresentativePicture, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JourneyDiaryRepresentativePicture> {
  try {
    await ensureTable();

    const created = await queryOne<JourneyDiaryRepresentativePicture>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          journey_group_key,
          journey_year,
          journey_month,
          journey_country,
          caption,
          image_key,
          sort_order,
          visited_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING ${PICTURE_COLUMNS}
      `,
      [
        picture.userId || null,
        picture.journeyGroupKey,
        picture.journeyYear,
        picture.journeyMonth,
        picture.journeyCountry,
        picture.caption || null,
        picture.imageKey,
        picture.sortOrder ?? 0,
        picture.visitedAt || null,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_FAILED',
        message: 'Failed to create journey representative picture: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_ERROR',
        message: `Failed to create journey representative picture: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateJourneyDiaryRepresentativePicture(
  id: number,
  entry: Partial<
    Pick<JourneyDiaryRepresentativePicture, 'caption' | 'sortOrder' | 'isPublic' | 'visitedAt'>
  >,
): Promise<JourneyDiaryRepresentativePicture> {
  try {
    await ensureTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (entry.caption !== undefined) {
      fields.push(`caption = $${paramIndex}`);
      values.push(entry.caption || null);
      paramIndex += 1;
    }

    if (entry.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex}`);
      values.push(entry.sortOrder ?? 0);
      paramIndex += 1;
    }

    if (entry.isPublic !== undefined) {
      fields.push(`is_public = $${paramIndex}`);
      values.push(entry.isPublic ?? 0);
      paramIndex += 1;
    }

    if (entry.visitedAt !== undefined) {
      fields.push(`visited_at = $${paramIndex}`);
      values.push(entry.visitedAt || null);
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getJourneyDiaryRepresentativePictureById(id);

      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_NOT_FOUND',
          message: 'Journey representative picture not found',
        });
      }

      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<JourneyDiaryRepresentativePicture>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${PICTURE_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_NOT_FOUND',
        message: 'Journey representative picture not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_ERROR',
        message: `Failed to update journey representative picture: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteJourneyDiaryRepresentativePicture(id: number): Promise<boolean> {
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
        code: 'DELETE_JOURNEY_DIARY_REPRESENTATIVE_PICTURE_ERROR',
        message: `Failed to delete journey representative picture: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
