import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'bookshelf_audiobook';

const AUDIO_FILE_TYPES = new Set(['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac']);

export type BookshelfAudiobookFileType = 'mp3' | 'm4a' | 'wav' | 'ogg' | 'aac' | 'flac';

export interface BookshelfAudiobook {
  id: number;
  customerId?: string | null;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  fileType: BookshelfAudiobookFileType;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: Date | null;
}

const SELECT_COLUMNS = `
  id,
  customer_id as "customerId",
  title,
  author,
  description,
  cover_image as "coverImage",
  file_url as "fileUrl",
  file_type as "fileType",
  "order",
  is_public as "isPublic",
  created_at as "createdAt"
`;

let ensureTablePromise: Promise<void> | null = null;
let ensureIsPublicColumnPromise: Promise<void> | null = null;
let ensureCustomerIdColumnPromise: Promise<void> | null = null;

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

const normalizeFileType = (value: unknown): BookshelfAudiobookFileType => {
  const normalized = String(value || '').trim().toLowerCase();
  return AUDIO_FILE_TYPES.has(normalized) ? (normalized as BookshelfAudiobookFileType) : 'mp3';
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

  return 0;
};

const ensureIsPublicColumn = async (): Promise<void> => {
  if (!ensureIsPublicColumnPromise) {
    ensureIsPublicColumnPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS is_public SMALLINT NOT NULL DEFAULT 0`,
      );
    })().catch((error) => {
      ensureIsPublicColumnPromise = null;
      throw error;
    });
  }

  await ensureIsPublicColumnPromise;
};

const ensureCustomerIdColumn = async (): Promise<void> => {
  if (!ensureCustomerIdColumnPromise) {
    ensureCustomerIdColumnPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255)`,
      );
    })().catch((error) => {
      ensureCustomerIdColumnPromise = null;
      throw error;
    });
  }

  await ensureCustomerIdColumnPromise;
};

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255),
            description TEXT,
            cover_image TEXT,
            file_url TEXT NOT NULL,
            file_type VARCHAR(16) NOT NULL DEFAULT 'mp3',
            "order" INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
  await ensureIsPublicColumn();
  await ensureCustomerIdColumn();
};

export async function getAllBookshelfAudiobooks(
  customerId?: string,
  limit: number = 100,
  offset: number = 0,
): Promise<BookshelfAudiobook[]> {
  try {
    await ensureTable();

    const normalizedLimit = Math.max(1, Math.min(300, parseInteger(limit) ?? 100));
    const normalizedOffset = Math.max(0, parseInteger(offset) ?? 0);
    const normalizedCustomerId = String(customerId || '').trim();

    if (!normalizedCustomerId) {
      return [];
    }

    return await queryMany<BookshelfAudiobook>(
      `
        SELECT
          ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
        ORDER BY COALESCE("order", 2147483647) ASC, created_at DESC, id DESC
        LIMIT $2 OFFSET $3
      `,
      [normalizedCustomerId, normalizedLimit, normalizedOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BOOKSHELF_AUDIOBOOKS_ERROR',
        message: `Failed to fetch bookshelf audio-books: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getBookshelfAudiobookById(id: number): Promise<BookshelfAudiobook | null> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_AUDIOBOOK_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<BookshelfAudiobook>(
      `
        SELECT
          ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BOOKSHELF_AUDIOBOOK_ERROR',
        message: `Failed to fetch bookshelf audio-book: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createBookshelfAudiobook(
  item: Omit<BookshelfAudiobook, 'id' | 'createdAt'>,
): Promise<BookshelfAudiobook> {
  try {
    await ensureTable();

    const created = await queryOne<BookshelfAudiobook>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          title,
          author,
          description,
          cover_image,
          file_url,
          file_type,
          "order",
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING
          ${SELECT_COLUMNS}
      `,
      [
        item.customerId ?? null,
        item.title,
        item.author ?? null,
        item.description ?? null,
        item.coverImage ?? null,
        item.fileUrl,
        normalizeFileType(item.fileType),
        normalizeNullableInteger(item.order),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BOOKSHELF_AUDIOBOOK_FAILED',
        message: 'Failed to create bookshelf audio-book',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_BOOKSHELF_AUDIOBOOK_ERROR',
        message: `Failed to create bookshelf audio-book: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updateBookshelfAudiobook(
  id: number,
  updates: Partial<Omit<BookshelfAudiobook, 'id' | 'createdAt'>>,
): Promise<BookshelfAudiobook> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_AUDIOBOOK_ID',
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

    if (updates.fileType !== undefined) {
      fields.push(`file_type = $${paramIndex}`);
      values.push(normalizeFileType(updates.fileType));
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
      const existing = await getBookshelfAudiobookById(normalizedId);
      if (!existing) {
        throw new DatabaseError({
          code: 'BOOKSHELF_AUDIOBOOK_NOT_FOUND',
          message: 'Bookshelf audio-book not found',
        });
      }

      return existing;
    }

    values.push(normalizedId);

    const updated = await queryOne<BookshelfAudiobook>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          ${SELECT_COLUMNS}
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'BOOKSHELF_AUDIOBOOK_NOT_FOUND',
        message: 'Bookshelf audio-book not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_BOOKSHELF_AUDIOBOOK_ERROR',
        message: `Failed to update bookshelf audio-book: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteBookshelfAudiobook(id: number): Promise<boolean> {
  try {
    await ensureTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKSHELF_AUDIOBOOK_ID',
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
        code: 'DELETE_BOOKSHELF_AUDIOBOOK_ERROR',
        message: `Failed to delete bookshelf audio-book: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
