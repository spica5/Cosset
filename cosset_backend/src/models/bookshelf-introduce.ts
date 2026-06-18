import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'bookshelf_introduce';
const LEGACY_TABLE_NAME = 'bookshelf_introduce_books';

export interface BookshelfIntroduce {
  id: number;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  order?: number | null;
  createdAt?: Date | null;
}

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

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          DO $$
          BEGIN
            IF to_regclass('public.${LEGACY_TABLE_NAME}') IS NOT NULL
               AND to_regclass('public.${TABLE_NAME}') IS NULL
            THEN
              ALTER TABLE ${LEGACY_TABLE_NAME} RENAME TO ${TABLE_NAME};
            END IF;
          END $$;
        `,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255),
            description TEXT,
            cover_image TEXT,
            file_url TEXT NOT NULL,
            "order" INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN IF NOT EXISTS author VARCHAR(255)
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function getAllBookshelfIntroduce(
  limit: number = 100,
  offset: number = 0,
): Promise<BookshelfIntroduce[]> {
  try {
    await ensureTable();

    const normalizedLimit = Math.max(1, Math.min(300, parseInteger(limit) ?? 100));
    const normalizedOffset = Math.max(0, parseInteger(offset) ?? 0);

    return await queryMany<BookshelfIntroduce>(
      `
        SELECT
          id,
          title,
          author,
          description,
          cover_image as "coverImage",
          file_url as "fileUrl",
          "order",
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        ORDER BY COALESCE("order", 2147483647) ASC, created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
      [normalizedLimit, normalizedOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BOOKSHELF_INTRODUCE_ERROR',
        message: `Failed to fetch bookshelf introduce items: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getBookshelfIntroduceById(id: number): Promise<BookshelfIntroduce | null> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_INTRODUCE_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<BookshelfIntroduce>(
      `
        SELECT
          id,
          title,
          author,
          description,
          cover_image as "coverImage",
          file_url as "fileUrl",
          "order",
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BOOKSHELF_INTRODUCE_ITEM_ERROR',
        message: `Failed to fetch bookshelf introduce item: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createBookshelfIntroduce(
  item: Omit<BookshelfIntroduce, 'id' | 'createdAt'>,
): Promise<BookshelfIntroduce> {
  try {
    await ensureTable();

    const created = await queryOne<BookshelfIntroduce>(
      `
        INSERT INTO ${TABLE_NAME} (
          title,
          author,
          description,
          cover_image,
          file_url,
          "order",
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING
          id,
          title,
          author,
          description,
          cover_image as "coverImage",
          file_url as "fileUrl",
          "order",
          created_at as "createdAt"
      `,
      [
        item.title,
        item.author ?? null,
        item.description ?? null,
        item.coverImage ?? null,
        item.fileUrl,
        normalizeNullableInteger(item.order),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BOOKSHELF_INTRODUCE_FAILED',
        message: 'Failed to create bookshelf introduce item',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_BOOKSHELF_INTRODUCE_ERROR',
        message: `Failed to create bookshelf introduce item: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updateBookshelfIntroduce(
  id: number,
  updates: Partial<Omit<BookshelfIntroduce, 'id' | 'createdAt'>>,
): Promise<BookshelfIntroduce> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_INTRODUCE_ID',
        message: 'id must be a valid integer',
      });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex += 1;
    }

    if (updates.author !== undefined) {
      fields.push(`author = $${paramIndex}`);
      values.push(updates.author ?? null);
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.coverImage !== undefined) {
      fields.push(`cover_image = $${paramIndex}`);
      values.push(updates.coverImage ?? null);
      paramIndex += 1;
    }

    if (updates.fileUrl !== undefined) {
      fields.push(`file_url = $${paramIndex}`);
      values.push(updates.fileUrl);
      paramIndex += 1;
    }

    if (updates.order !== undefined) {
      fields.push(`"order" = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.order));
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getBookshelfIntroduceById(normalizedId);
      if (!existing) {
        throw new DatabaseError({
          code: 'BOOKSHELF_INTRODUCE_NOT_FOUND',
          message: 'Bookshelf introduce item not found',
        });
      }

      return existing;
    }

    values.push(normalizedId);

    const updated = await queryOne<BookshelfIntroduce>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          title,
          author,
          description,
          cover_image as "coverImage",
          file_url as "fileUrl",
          "order",
          created_at as "createdAt"
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'BOOKSHELF_INTRODUCE_NOT_FOUND',
        message: 'Bookshelf introduce item not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_BOOKSHELF_INTRODUCE_ERROR',
        message: `Failed to update bookshelf introduce item: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteBookshelfIntroduce(id: number): Promise<boolean> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_INTRODUCE_ID',
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
        code: 'DELETE_BOOKSHELF_INTRODUCE_ERROR',
        message: `Failed to delete bookshelf introduce item: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
