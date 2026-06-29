import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany, queryOne } from '@/db/neon';

const BOOKMARKS_TABLE = 'bookshelf_ebook_bookmarks';
const COMMENTS_TABLE = 'bookshelf_ebook_reading_comments';
const USERS_TABLE = 'cosset_users';

export interface BookshelfEbookBookmark {
  id: number;
  bookId: number;
  customerId: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  label?: string | null;
  createdAt?: Date | null;
}

export interface BookshelfEbookReadingComment {
  id: number;
  bookId: number;
  customerId: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  comment: string;
  createdAt?: Date | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
}

export interface BookshelfEbookReadingCount {
  bookId: number;
  bookmarkCount: number;
  commentCount: number;
}

let ensureBookmarksTablePromise: Promise<void> | null = null;
let ensureCommentsTablePromise: Promise<void> | null = null;

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

const normalizeScrollPosition = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const ensureBookmarksTable = async (): Promise<void> => {
  if (!ensureBookmarksTablePromise) {
    ensureBookmarksTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${BOOKMARKS_TABLE} (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL,
            customer_id UUID NOT NULL,
            page_number INTEGER,
            scroll_position INTEGER,
            label VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_ebook_bookmarks_book_customer ON ${BOOKMARKS_TABLE} (book_id, customer_id, created_at DESC)`,
      );
    })().catch((error) => {
      ensureBookmarksTablePromise = null;
      throw error;
    });
  }

  await ensureBookmarksTablePromise;
};

const ensureCommentsTable = async (): Promise<void> => {
  if (!ensureCommentsTablePromise) {
    ensureCommentsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${COMMENTS_TABLE} (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL,
            customer_id UUID NOT NULL,
            page_number INTEGER,
            scroll_position INTEGER,
            comment TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_ebook_reading_comments_book ON ${COMMENTS_TABLE} (book_id, created_at DESC)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_ebook_reading_comments_customer ON ${COMMENTS_TABLE} (customer_id)`,
      );
    })().catch((error) => {
      ensureCommentsTablePromise = null;
      throw error;
    });
  }

  await ensureCommentsTablePromise;
};

export async function getBookshelfEbookBookmarks(
  bookId: number,
  customerId: string,
): Promise<BookshelfEbookBookmark[]> {
  try {
    await ensureBookmarksTable();

    const normalizedBookId = parseInteger(bookId);
    const normalizedCustomerId = String(customerId || '').trim();

    if (normalizedBookId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOK_ID',
        message: 'bookId must be a valid integer',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    return await queryMany<BookshelfEbookBookmark>(
      `
        SELECT
          id,
          book_id as "bookId",
          customer_id as "customerId",
          page_number as "pageNumber",
          scroll_position as "scrollPosition",
          label,
          created_at as "createdAt"
        FROM ${BOOKMARKS_TABLE}
        WHERE book_id = $1 AND customer_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [normalizedBookId, normalizedCustomerId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'FETCH_BOOKMARKS_FAILED',
      message: `Failed to fetch e-book bookmarks: ${(error as Error).message}`,
    });
  }
}

export async function createBookshelfEbookBookmark(params: {
  bookId: number;
  customerId: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  label?: string | null;
}): Promise<BookshelfEbookBookmark> {
  try {
    await ensureBookmarksTable();

    const normalizedBookId = parseInteger(params.bookId);
    const normalizedCustomerId = String(params.customerId || '').trim();

    if (normalizedBookId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOK_ID',
        message: 'bookId must be a valid integer',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    const pageNumber = parseInteger(params.pageNumber);
    const scrollPosition = normalizeScrollPosition(params.scrollPosition);
    const label = typeof params.label === 'string' ? params.label.trim().slice(0, 255) : null;

    if (pageNumber === null && scrollPosition === null) {
      throw new DatabaseError({
        code: 'INVALID_POSITION',
        message: 'pageNumber or scrollPosition is required',
      });
    }

    const created = await queryOne<BookshelfEbookBookmark>(
      `
        INSERT INTO ${BOOKMARKS_TABLE} (
          book_id,
          customer_id,
          page_number,
          scroll_position,
          label
        )
        VALUES ($1, $2::uuid, $3, $4, $5)
        RETURNING
          id,
          book_id as "bookId",
          customer_id as "customerId",
          page_number as "pageNumber",
          scroll_position as "scrollPosition",
          label,
          created_at as "createdAt"
      `,
      [normalizedBookId, normalizedCustomerId, pageNumber, scrollPosition, label || null],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BOOKMARK_FAILED',
        message: 'Failed to create bookmark',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'CREATE_BOOKMARK_FAILED',
      message: `Failed to create e-book bookmark: ${(error as Error).message}`,
    });
  }
}

export async function deleteBookshelfEbookBookmark(
  bookmarkId: number,
  customerId: string,
): Promise<boolean> {
  try {
    await ensureBookmarksTable();

    const normalizedBookmarkId = parseInteger(bookmarkId);
    const normalizedCustomerId = String(customerId || '').trim();

    if (normalizedBookmarkId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOKMARK_ID',
        message: 'bookmarkId must be a valid integer',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    const result = await executeQuery(
      `
        DELETE FROM ${BOOKMARKS_TABLE}
        WHERE id = $1 AND customer_id = $2::uuid
      `,
      [normalizedBookmarkId, normalizedCustomerId],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'DELETE_BOOKMARK_FAILED',
      message: `Failed to delete e-book bookmark: ${(error as Error).message}`,
    });
  }
}

export async function getBookshelfEbookReadingComments(
  bookId: number,
  customerId?: string | null,
): Promise<BookshelfEbookReadingComment[]> {
  try {
    await ensureCommentsTable();

    const normalizedBookId = parseInteger(bookId);

    if (normalizedBookId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOK_ID',
        message: 'bookId must be a valid integer',
      });
    }

    const normalizedCustomerId = String(customerId || '').trim();

    const rows = await queryMany<BookshelfEbookReadingComment>(
      `
        SELECT
          c.id,
          c.book_id as "bookId",
          c.customer_id as "customerId",
          c.page_number as "pageNumber",
          c.scroll_position as "scrollPosition",
          c.comment,
          c.created_at as "createdAt",
          u.first_name as "customerFirstName",
          u.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
            u.email
          ) as "customerDisplayName",
          u.email as "customerEmail",
          u.photo_url as "customerPhotoURL"
        FROM ${COMMENTS_TABLE} c
        LEFT JOIN ${USERS_TABLE} u ON u.id = c.customer_id
        WHERE c.book_id = $1
          ${normalizedCustomerId ? 'AND c.customer_id = $2::uuid' : ''}
        ORDER BY c.created_at DESC
        LIMIT 200
      `,
      normalizedCustomerId ? [normalizedBookId, normalizedCustomerId] : [normalizedBookId],
    );

    return rows;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'FETCH_READING_COMMENTS_FAILED',
      message: `Failed to fetch e-book reading comments: ${(error as Error).message}`,
    });
  }
}

export async function createBookshelfEbookReadingComment(params: {
  bookId: number;
  customerId: string;
  comment: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
}): Promise<BookshelfEbookReadingComment> {
  try {
    await ensureCommentsTable();

    const normalizedBookId = parseInteger(params.bookId);
    const normalizedCustomerId = String(params.customerId || '').trim();
    const comment = typeof params.comment === 'string' ? params.comment.trim() : '';

    if (normalizedBookId === null) {
      throw new DatabaseError({
        code: 'INVALID_BOOK_ID',
        message: 'bookId must be a valid integer',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    if (!comment) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT',
        message: 'comment is required',
      });
    }

    const pageNumber = parseInteger(params.pageNumber);
    const scrollPosition = normalizeScrollPosition(params.scrollPosition);

    const created = await queryOne<BookshelfEbookReadingComment>(
      `
        INSERT INTO ${COMMENTS_TABLE} (
          book_id,
          customer_id,
          page_number,
          scroll_position,
          comment
        )
        VALUES ($1, $2::uuid, $3, $4, $5)
        RETURNING
          id,
          book_id as "bookId",
          customer_id as "customerId",
          page_number as "pageNumber",
          scroll_position as "scrollPosition",
          comment,
          created_at as "createdAt"
      `,
      [normalizedBookId, normalizedCustomerId, pageNumber, scrollPosition, comment],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_READING_COMMENT_FAILED',
        message: 'Failed to create reading comment',
      });
    }

    const withUser = await queryOne<BookshelfEbookReadingComment>(
      `
        SELECT
          c.id,
          c.book_id as "bookId",
          c.customer_id as "customerId",
          c.page_number as "pageNumber",
          c.scroll_position as "scrollPosition",
          c.comment,
          c.created_at as "createdAt",
          u.first_name as "customerFirstName",
          u.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
            u.email
          ) as "customerDisplayName",
          u.email as "customerEmail",
          u.photo_url as "customerPhotoURL"
        FROM ${COMMENTS_TABLE} c
        LEFT JOIN ${USERS_TABLE} u ON u.id = c.customer_id
        WHERE c.id = $1
      `,
      [created.id],
    );

    return withUser || created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'CREATE_READING_COMMENT_FAILED',
      message: `Failed to create e-book reading comment: ${(error as Error).message}`,
    });
  }
}

export async function deleteBookshelfEbookReadingComment(
  commentId: number,
  customerId: string,
): Promise<boolean> {
  try {
    await ensureCommentsTable();

    const normalizedCommentId = parseInteger(commentId);
    const normalizedCustomerId = String(customerId || '').trim();

    if (normalizedCommentId === null) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT_ID',
        message: 'commentId must be a valid integer',
      });
    }

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    const result = await executeQuery(
      `
        DELETE FROM ${COMMENTS_TABLE}
        WHERE id = $1 AND customer_id = $2::uuid
      `,
      [normalizedCommentId, normalizedCustomerId],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'DELETE_READING_COMMENT_FAILED',
      message: `Failed to delete e-book reading comment: ${(error as Error).message}`,
    });
  }
}

export async function getBookshelfEbookReadingCounts(
  bookIds: number[],
  customerId: string,
): Promise<BookshelfEbookReadingCount[]> {
  try {
    await ensureBookmarksTable();
    await ensureCommentsTable();

    const normalizedCustomerId = String(customerId || '').trim();
    const normalizedBookIds = [...new Set(bookIds.map((id) => parseInteger(id)).filter((id): id is number => id !== null))];

    if (!normalizedCustomerId) {
      throw new DatabaseError({
        code: 'INVALID_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }

    if (!normalizedBookIds.length) {
      return [];
    }

    const bookmarkRows = await queryMany<{ bookId: number; count: number }>(
      `
        SELECT book_id as "bookId", COUNT(*)::int as count
        FROM ${BOOKMARKS_TABLE}
        WHERE customer_id = $1::uuid
          AND book_id = ANY($2::bigint[])
        GROUP BY book_id
      `,
      [normalizedCustomerId, normalizedBookIds],
    );

    const commentRows = await queryMany<{ bookId: number; count: number }>(
      `
        SELECT book_id as "bookId", COUNT(*)::int as count
        FROM ${COMMENTS_TABLE}
        WHERE customer_id = $1::uuid
          AND book_id = ANY($2::bigint[])
        GROUP BY book_id
      `,
      [normalizedCustomerId, normalizedBookIds],
    );

    const bookmarkMap = new Map(
      bookmarkRows.map((row) => {
        const bookId = parseInteger(row.bookId);
        return [bookId ?? 0, parseInteger(row.count) ?? 0] as const;
      }),
    );

    const commentMap = new Map(
      commentRows.map((row) => {
        const bookId = parseInteger(row.bookId);
        return [bookId ?? 0, parseInteger(row.count) ?? 0] as const;
      }),
    );

    return normalizedBookIds.map((bookId) => ({
      bookId,
      bookmarkCount: bookmarkMap.get(bookId) ?? 0,
      commentCount: commentMap.get(bookId) ?? 0,
    }));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'FETCH_READING_COUNTS_FAILED',
      message: `Failed to fetch e-book reading counts: ${(error as Error).message}`,
    });
  }
}
