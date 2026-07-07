import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'journey_diary_notes';

export interface JourneyDiaryNote {
  id: number;
  userId?: string | null;
  journeyGroupKey: string;
  journeyYear: number;
  journeyMonth: number;
  journeyCountry: string;
  pictureId?: number | null;
  imageKey?: string | null;
  title: string;
  content: string;
  noteDate?: Date | string | null;
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
          picture_id BIGINT,
          image_key TEXT,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          note_date TIMESTAMP,
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

const NOTE_COLUMNS = `
  id,
  user_id as "userId",
  journey_group_key as "journeyGroupKey",
  journey_year as "journeyYear",
  journey_month as "journeyMonth",
  journey_country as "journeyCountry",
  picture_id as "pictureId",
  image_key as "imageKey",
  title,
  content,
  note_date as "noteDate",
  sort_order as "sortOrder",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function getJourneyDiaryNoteById(id: number): Promise<JourneyDiaryNote | null> {
  try {
    await ensureTable();

    return await queryOne<JourneyDiaryNote>(
      `
        SELECT ${NOTE_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_NOTE_ERROR',
        message: `Failed to fetch journey note: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getJourneyDiaryNotes(
  userId?: string,
  journeyGroupKey?: string,
  limit: number = 200,
  offset: number = 0,
): Promise<JourneyDiaryNote[]> {
  try {
    await ensureTable();

    const params: unknown[] = [];
    let sql = `
      SELECT ${NOTE_COLUMNS}
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
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY COALESCE(note_date, created_at) DESC, sort_order ASC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    return await queryMany<JourneyDiaryNote>(sql, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_NOTES_ERROR',
        message: `Failed to fetch journey notes: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createJourneyDiaryNote(
  note: Omit<JourneyDiaryNote, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JourneyDiaryNote> {
  try {
    await ensureTable();

    const created = await queryOne<JourneyDiaryNote>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          journey_group_key,
          journey_year,
          journey_month,
          journey_country,
          picture_id,
          image_key,
          title,
          content,
          note_date,
          sort_order,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING ${NOTE_COLUMNS}
      `,
      [
        note.userId || null,
        note.journeyGroupKey,
        note.journeyYear,
        note.journeyMonth,
        note.journeyCountry,
        note.pictureId ?? null,
        note.imageKey ?? null,
        note.title,
        note.content,
        note.noteDate ?? null,
        note.sortOrder ?? 0,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_NOTE_FAILED',
        message: 'Failed to create journey note: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_JOURNEY_DIARY_NOTE_ERROR',
        message: `Failed to create journey note: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateJourneyDiaryNote(
  id: number,
  entry: Partial<
    Pick<JourneyDiaryNote, 'pictureId' | 'imageKey' | 'title' | 'content' | 'noteDate' | 'sortOrder'>
  >,
): Promise<JourneyDiaryNote> {
  try {
    await ensureTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

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

    if (entry.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(entry.title);
      paramIndex += 1;
    }

    if (entry.content !== undefined) {
      fields.push(`content = $${paramIndex}`);
      values.push(entry.content);
      paramIndex += 1;
    }

    if (entry.noteDate !== undefined) {
      fields.push(`note_date = $${paramIndex}`);
      values.push(entry.noteDate ?? null);
      paramIndex += 1;
    }

    if (entry.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex}`);
      values.push(entry.sortOrder ?? 0);
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getJourneyDiaryNoteById(id);

      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_JOURNEY_DIARY_NOTE_NOT_FOUND',
          message: 'Journey note not found',
        });
      }

      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<JourneyDiaryNote>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${NOTE_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_NOTE_NOT_FOUND',
        message: 'Journey note not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_JOURNEY_DIARY_NOTE_ERROR',
        message: `Failed to update journey note: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteJourneyDiaryNote(id: number): Promise<boolean> {
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
        code: 'DELETE_JOURNEY_DIARY_NOTE_ERROR',
        message: `Failed to delete journey note: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
