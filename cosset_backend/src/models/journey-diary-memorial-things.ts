import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { deleteJourneyDiaryMemorialThingImages } from './journey-diary-memorial-thing-images';

const TABLE_NAME = 'journey_diary_memorial_things';

export type JourneyMemorialThingCategory =
  | 'scenery'
  | 'food'
  | 'culture'
  | 'people'
  | 'special_events';

export interface JourneyDiaryMemorialThing {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  category: JourneyMemorialThingCategory;
  title: string;
  description?: string | null;
  pictureId?: number | null;
  imageKey?: string | null;
  memorialDate?: Date | string | null;
  sortOrder?: number | null;
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
          category VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          picture_id BIGINT,
          image_key TEXT,
          memorial_date TIMESTAMP,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
    )
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
};

const MEMORIAL_THING_COLUMNS = `
  id,
  user_id as "userId",
  journey_group_key as "journeyGroupKey",
  journey_year as "journeyYear",
  journey_month as "journeyMonth",
  journey_country as "journeyCountry",
  category,
  title,
  description,
  picture_id as "pictureId",
  image_key as "imageKey",
  memorial_date as "memorialDate",
  sort_order as "sortOrder",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function getJourneyDiaryMemorialThingById(
  id: number,
): Promise<JourneyDiaryMemorialThing | null> {
  try {
    await ensureTable();

    return await queryOne<JourneyDiaryMemorialThing>(
      `
        SELECT ${MEMORIAL_THING_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_MEMORIAL_THING_ERROR',
        message: `Failed to fetch memorial thing: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getJourneyDiaryMemorialThings(
  userId?: string,
  journeyGroupKey?: string,
  category?: string,
  limit: number = 200,
  offset: number = 0,
): Promise<JourneyDiaryMemorialThing[]> {
  try {
    await ensureTable();

    const params: unknown[] = [];
    let sql = `
      SELECT ${MEMORIAL_THING_COLUMNS}
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

    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY COALESCE(memorial_date, created_at) DESC, sort_order ASC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    return await queryMany<JourneyDiaryMemorialThing>(sql, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_MEMORIAL_THINGS_ERROR',
        message: `Failed to fetch memorial things: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createJourneyDiaryMemorialThing(
  item: Omit<JourneyDiaryMemorialThing, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JourneyDiaryMemorialThing> {
  try {
    await ensureTable();

    const created = await queryOne<JourneyDiaryMemorialThing>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          journey_group_key,
          journey_year,
          journey_month,
          journey_country,
          category,
          title,
          description,
          picture_id,
          image_key,
          memorial_date,
          sort_order,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING ${MEMORIAL_THING_COLUMNS}
      `,
      [
        item.userId || null,
        item.journeyGroupKey,
        item.journeyYear,
        item.journeyMonth,
        item.journeyCountry,
        item.category,
        item.title,
        item.description || null,
        item.pictureId ?? null,
        item.imageKey ?? null,
        item.memorialDate ?? null,
        item.sortOrder ?? 0,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_MEMORIAL_THING_FAILED',
        message: 'Failed to create memorial thing: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_MEMORIAL_THING_ERROR',
        message: `Failed to create memorial thing: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateJourneyDiaryMemorialThing(
  id: number,
  entry: Partial<
    Pick<
      JourneyDiaryMemorialThing,
      | 'category'
      | 'title'
      | 'description'
      | 'pictureId'
      | 'imageKey'
      | 'memorialDate'
      | 'sortOrder'
    >
  >,
): Promise<JourneyDiaryMemorialThing> {
  try {
    await ensureTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (entry.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(entry.category);
      paramIndex += 1;
    }

    if (entry.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(entry.title);
      paramIndex += 1;
    }

    if (entry.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(entry.description || null);
      paramIndex += 1;
    }

    if (entry.pictureId !== undefined) {
      fields.push(`picture_id = $${paramIndex}`);
      values.push(entry.pictureId ?? null);
      paramIndex += 1;
    }

    if (entry.imageKey !== undefined) {
      fields.push(`image_key = $${paramIndex}`);
      values.push(entry.imageKey ?? null);
      paramIndex += 1;
    }

    if (entry.memorialDate !== undefined) {
      fields.push(`memorial_date = $${paramIndex}`);
      values.push(entry.memorialDate ?? null);
      paramIndex += 1;
    }

    if (entry.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex}`);
      values.push(entry.sortOrder ?? 0);
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getJourneyDiaryMemorialThingById(id);

      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_JOURNEY_DIARY_MEMORIAL_THING_NOT_FOUND',
          message: 'Memorial thing not found',
        });
      }

      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<JourneyDiaryMemorialThing>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${MEMORIAL_THING_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_MEMORIAL_THING_NOT_FOUND',
        message: 'Memorial thing not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_MEMORIAL_THING_ERROR',
        message: `Failed to update memorial thing: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteJourneyDiaryMemorialThing(id: number): Promise<boolean> {
  try {
    await ensureTable();

    await deleteJourneyDiaryMemorialThingImages(id);

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
        code: 'DELETE_JOURNEY_DIARY_MEMORIAL_THING_ERROR',
        message: `Failed to delete memorial thing: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
