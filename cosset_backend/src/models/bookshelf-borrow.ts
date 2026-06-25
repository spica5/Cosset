import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { BOOKSHELF_BORROW_PERIOD_DAYS, normalizeBorrowPeriodDays } from '@/constants/bookshelf-borrow';

import { getBookshelfEbookById } from './bookshelf-ebook';
import { getBookshelfAudiobookById } from './bookshelf-audiobook';

export { BOOKSHELF_BORROW_PERIOD_DAYS, normalizeBorrowPeriodDays };

// ----------------------------------------------------------------------

const TABLE_NAME = 'bookshelf_borrow';

export type BookshelfBorrowStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled'
  | 'expired';
export type BookshelfBorrowBookKind = 'ebook' | 'audiobook';
export type BookshelfBorrowRole = 'borrower' | 'owner';

export interface BookshelfBorrow {
  id: number;
  borrowerCustomerId: string;
  ownerCustomerId: string;
  bookKind: BookshelfBorrowBookKind;
  bookId: number;
  status: BookshelfBorrowStatus;
  requestedAt?: Date | null;
  respondedAt?: Date | null;
  borrowPeriodDays?: number | null;
  expiresAt?: Date | null;
}

export interface BookshelfBorrowWithBook extends BookshelfBorrow {
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCoverImage?: string | null;
  bookFileType?: string | null;
  bookCategory?: string | null;
  bookFileUrl?: string | null;
  bookRefUrl?: string | null;
  bookDescription?: string | null;
  bookCreatedAt?: Date | null;
  counterpartyName?: string | null;
}

const SELECT_COLUMNS = `
  id,
  borrower_customer_id as "borrowerCustomerId",
  owner_customer_id as "ownerCustomerId",
  book_kind as "bookKind",
  book_id as "bookId",
  status,
  requested_at as "requestedAt",
  responded_at as "respondedAt",
  borrow_period_days as "borrowPeriodDays",
  expires_at as "expiresAt"
`;

let ensureTablePromise: Promise<void> | null = null;
let ensureExpiresAtColumnPromise: Promise<void> | null = null;

const ensureExpiresAtColumn = async (): Promise<void> => {
  if (!ensureExpiresAtColumnPromise) {
    ensureExpiresAtColumnPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL`,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS borrow_period_days INTEGER NULL`,
      );

      await executeQuery(
        `
          UPDATE ${TABLE_NAME}
          SET borrow_period_days = $1
          WHERE borrow_period_days IS NULL
        `,
        [BOOKSHELF_BORROW_PERIOD_DAYS],
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ALTER COLUMN borrow_period_days SET DEFAULT ${BOOKSHELF_BORROW_PERIOD_DAYS}
        `,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} DROP CONSTRAINT IF EXISTS chk_bookshelf_borrow_status`,
      );

      await executeQuery(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD CONSTRAINT chk_bookshelf_borrow_status CHECK (
            status IN ('pending', 'approved', 'rejected', 'returned', 'cancelled', 'expired')
          )
        `,
      );

      await executeQuery(
        `
          UPDATE ${TABLE_NAME}
          SET expires_at = COALESCE(responded_at, requested_at) + (borrow_period_days::text || ' days')::interval
          WHERE status = 'approved'
            AND expires_at IS NULL
            AND borrow_period_days IS NOT NULL
        `,
      );
    })().catch((error) => {
      ensureExpiresAtColumnPromise = null;
      throw error;
    });
  }

  await ensureExpiresAtColumnPromise;
};

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            borrower_customer_id VARCHAR(255) NOT NULL,
            owner_customer_id VARCHAR(255) NOT NULL,
            book_kind VARCHAR(16) NOT NULL,
            book_id BIGINT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP NULL,
            borrow_period_days INTEGER NOT NULL DEFAULT ${BOOKSHELF_BORROW_PERIOD_DAYS},
            expires_at TIMESTAMP NULL,
            CONSTRAINT chk_bookshelf_borrow_kind CHECK (book_kind IN ('ebook', 'audiobook')),
            CONSTRAINT chk_bookshelf_borrow_status CHECK (
              status IN ('pending', 'approved', 'rejected', 'returned', 'cancelled', 'expired')
            ),
            CONSTRAINT chk_bookshelf_borrow_not_self CHECK (borrower_customer_id <> owner_customer_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_borrow_borrower_status ON ${TABLE_NAME} (borrower_customer_id, status)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_borrow_owner_status ON ${TABLE_NAME} (owner_customer_id, status)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_bookshelf_borrow_book ON ${TABLE_NAME} (book_kind, book_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
  await ensureExpiresAtColumn();
};

export async function expireOverdueBorrows(): Promise<BookshelfBorrow[]> {
  await ensureTable();

  return queryMany<BookshelfBorrow>(
    `
      UPDATE ${TABLE_NAME}
      SET
        status = 'expired',
        responded_at = NOW()
      WHERE status = 'approved'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      RETURNING ${SELECT_COLUMNS}
    `,
  );
}

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const isActiveBorrowStatus = (status: BookshelfBorrowStatus) =>
  status === 'pending' || status === 'approved';

const getBookForOwner = async (
  bookKind: BookshelfBorrowBookKind,
  bookId: number,
  ownerCustomerId: string,
) => {
  const book =
    bookKind === 'ebook'
      ? await getBookshelfEbookById(bookId)
      : await getBookshelfAudiobookById(bookId);

  if (!book) {
    return null;
  }

  if (String(book.customerId || '').trim() !== ownerCustomerId) {
    return null;
  }

  return book;
};

export async function createBookshelfBorrowRequest(input: {
  borrowerCustomerId: string;
  ownerCustomerId: string;
  bookKind: BookshelfBorrowBookKind;
  bookId: number;
  borrowPeriodDays?: number;
}): Promise<BookshelfBorrow> {
  await ensureTable();

  const borrowerCustomerId = String(input.borrowerCustomerId || '').trim();
  const ownerCustomerId = String(input.ownerCustomerId || '').trim();
  const bookKind = input.bookKind;
  const bookId = parseInteger(input.bookId);
  const borrowPeriodDays = normalizeBorrowPeriodDays(input.borrowPeriodDays);

  if (!borrowerCustomerId || !ownerCustomerId) {
    throw new DatabaseError({
      code: 'BORROW_INVALID_CUSTOMERS',
      message: 'borrowerCustomerId and ownerCustomerId are required',
    });
  }

  if (borrowerCustomerId === ownerCustomerId) {
    throw new DatabaseError({
      code: 'BORROW_SELF',
      message: 'You cannot borrow your own book',
    });
  }

  if (!bookId || (bookKind !== 'ebook' && bookKind !== 'audiobook')) {
    throw new DatabaseError({
      code: 'BORROW_INVALID_BOOK',
      message: 'A valid bookKind and bookId are required',
    });
  }

  const book = await getBookForOwner(bookKind, bookId, ownerCustomerId);

  if (!book) {
    throw new DatabaseError({
      code: 'BORROW_BOOK_NOT_FOUND',
      message: 'Book not found for this owner',
    });
  }

  if (!book.isPublic) {
    throw new DatabaseError({
      code: 'BORROW_BOOK_NOT_PUBLIC',
      message: 'Only public books can be borrowed',
    });
  }

  const existing = await queryOne<BookshelfBorrow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE borrower_customer_id = $1
        AND owner_customer_id = $2
        AND book_kind = $3
        AND book_id = $4
        AND status IN ('pending', 'approved')
      LIMIT 1
    `,
    [borrowerCustomerId, ownerCustomerId, bookKind, bookId],
  );

  if (existing) {
    throw new DatabaseError({
      code: 'BORROW_REQUEST_EXISTS',
      message:
        existing.status === 'approved'
          ? 'You already have an active borrow for this book'
          : 'A borrow request is already pending for this book',
    });
  }

  const row = await queryOne<BookshelfBorrow>(
    `
      INSERT INTO ${TABLE_NAME} (
        borrower_customer_id,
        owner_customer_id,
        book_kind,
        book_id,
        status,
        borrow_period_days
      )
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING ${SELECT_COLUMNS}
    `,
    [borrowerCustomerId, ownerCustomerId, bookKind, bookId, borrowPeriodDays],
  );

  if (!row) {
    throw new DatabaseError({
      code: 'BORROW_CREATE_FAILED',
      message: 'Failed to create borrow request',
    });
  }

  return row;
}

export async function getBookshelfBorrowById(id: number): Promise<BookshelfBorrow | null> {
  await ensureTable();

  const normalizedId = parseInteger(id);
  if (!normalizedId) {
    return null;
  }

  return queryOne<BookshelfBorrow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE id = $1
      LIMIT 1
    `,
    [normalizedId],
  );
}

export async function listBookshelfBorrows(input: {
  customerId: string;
  role?: BookshelfBorrowRole | 'all';
  status?: BookshelfBorrowStatus | 'all';
  limit?: number;
  offset?: number;
}): Promise<BookshelfBorrowWithBook[]> {
  await ensureTable();
  await expireOverdueBorrows();

  const customerId = String(input.customerId || '').trim();
  if (!customerId) {
    return [];
  }

  const role = input.role || 'all';
  const status = input.status || 'all';
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);

  const conditions: string[] = [];
  const params: unknown[] = [customerId];
  let paramIndex = 2;

  if (role === 'borrower') {
    conditions.push(`b.borrower_customer_id = $1`);
  } else if (role === 'owner') {
    conditions.push(`b.owner_customer_id = $1`);
  } else {
    conditions.push(`(b.borrower_customer_id = $1 OR b.owner_customer_id = $1)`);
  }

  if (status !== 'all') {
    conditions.push(`b.status = $${paramIndex}`);
    params.push(status);
    paramIndex += 1;
  }

  params.push(limit, offset);

  const rows = await queryMany<BookshelfBorrowWithBook>(
    `
      SELECT
        b.id,
        b.borrower_customer_id as "borrowerCustomerId",
        b.owner_customer_id as "ownerCustomerId",
        b.book_kind as "bookKind",
        b.book_id as "bookId",
        b.status,
        b.requested_at as "requestedAt",
        b.responded_at as "respondedAt",
        b.borrow_period_days as "borrowPeriodDays",
        b.expires_at as "expiresAt",
        COALESCE(e.title, a.title) as "bookTitle",
        COALESCE(e.author, a.author) as "bookAuthor",
        COALESCE(e.cover_image, a.cover_image) as "bookCoverImage",
        COALESCE(e.file_type, a.file_type) as "bookFileType",
        COALESCE(e.category, a.category) as "bookCategory",
        COALESCE(e.file_url, a.file_url) as "bookFileUrl",
        COALESCE(e.ref_url, a.ref_url) as "bookRefUrl",
        COALESCE(e.description, a.description) as "bookDescription",
        COALESCE(e.created_at, a.created_at) as "bookCreatedAt",
        CASE
          WHEN b.borrower_customer_id = $1 THEN TRIM(CONCAT(owner_user.first_name, ' ', owner_user.last_name))
          ELSE TRIM(CONCAT(borrower_user.first_name, ' ', borrower_user.last_name))
        END as "counterpartyName"
      FROM ${TABLE_NAME} b
      LEFT JOIN bookshelf_ebook e ON b.book_kind = 'ebook' AND e.id = b.book_id
      LEFT JOIN bookshelf_audiobook a ON b.book_kind = 'audiobook' AND a.id = b.book_id
      LEFT JOIN cosset_users owner_user ON owner_user.id::text = b.owner_customer_id
      LEFT JOIN cosset_users borrower_user ON borrower_user.id::text = b.borrower_customer_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.requested_at DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `,
    params,
  );

  return rows;
}

export async function getBookshelfBorrowStatusesForViewer(input: {
  borrowerCustomerId: string;
  ownerCustomerId: string;
  bookIds?: number[];
}): Promise<BookshelfBorrow[]> {
  await ensureTable();
  await expireOverdueBorrows();

  const borrowerCustomerId = String(input.borrowerCustomerId || '').trim();
  const ownerCustomerId = String(input.ownerCustomerId || '').trim();

  if (!borrowerCustomerId || !ownerCustomerId) {
    return [];
  }

  const bookIds = (input.bookIds || []).map((id) => parseInteger(id)).filter((id): id is number => !!id);

  if (!bookIds.length) {
    return queryMany<BookshelfBorrow>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE borrower_customer_id = $1
          AND owner_customer_id = $2
          AND status IN ('pending', 'approved')
        ORDER BY requested_at DESC
      `,
      [borrowerCustomerId, ownerCustomerId],
    );
  }

  return queryMany<BookshelfBorrow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE borrower_customer_id = $1
        AND owner_customer_id = $2
        AND book_id = ANY($3::bigint[])
        AND status IN ('pending', 'approved')
      ORDER BY requested_at DESC
    `,
    [borrowerCustomerId, ownerCustomerId, bookIds],
  );
}

export async function updateBookshelfBorrowStatus(input: {
  id: number;
  actorCustomerId: string;
  status: BookshelfBorrowStatus;
}): Promise<BookshelfBorrow | null> {
  await ensureTable();

  const borrowId = parseInteger(input.id);
  const actorCustomerId = String(input.actorCustomerId || '').trim();
  const nextStatus = input.status;

  if (!borrowId || !actorCustomerId) {
    return null;
  }

  const existing = await getBookshelfBorrowById(borrowId);
  if (!existing) {
    return null;
  }

  const isOwner = existing.ownerCustomerId === actorCustomerId;
  const isBorrower = existing.borrowerCustomerId === actorCustomerId;

  if (nextStatus === 'approved' || nextStatus === 'rejected') {
    if (!isOwner || existing.status !== 'pending') {
      return null;
    }
  } else if (nextStatus === 'cancelled') {
    if (!isBorrower || existing.status !== 'pending') {
      return null;
    }
  } else if (nextStatus === 'returned') {
    if (!isActiveBorrowStatus(existing.status) || existing.status !== 'approved') {
      return null;
    }

    if (!isOwner && !isBorrower) {
      return null;
    }
  } else {
    return null;
  }

  if (nextStatus === 'approved') {
    return queryOne<BookshelfBorrow>(
      `
        UPDATE ${TABLE_NAME}
        SET
          status = 'approved',
          responded_at = NOW(),
          expires_at = NOW() + (COALESCE(borrow_period_days, ${BOOKSHELF_BORROW_PERIOD_DAYS})::text || ' days')::interval
        WHERE id = $1
        RETURNING ${SELECT_COLUMNS}
      `,
      [borrowId],
    );
  }

  return queryOne<BookshelfBorrow>(
    `
      UPDATE ${TABLE_NAME}
      SET
        status = $2::varchar(20),
        responded_at = NOW(),
        expires_at = NULL
      WHERE id = $1
      RETURNING ${SELECT_COLUMNS}
    `,
    [borrowId, nextStatus],
  );
}

export async function getApprovedBorrowedBooksForCustomer(customerId: string): Promise<{
  ebooks: BookshelfBorrowWithBook[];
  audiobooks: BookshelfBorrowWithBook[];
}> {
  await ensureTable();

  const borrowerCustomerId = String(customerId || '').trim();
  if (!borrowerCustomerId) {
    return { ebooks: [], audiobooks: [] };
  }

  const rows = await listBookshelfBorrows({
    customerId: borrowerCustomerId,
    role: 'borrower',
    status: 'approved',
    limit: 500,
    offset: 0,
  });

  return {
    ebooks: rows.filter((row) => row.bookKind === 'ebook'),
    audiobooks: rows.filter((row) => row.bookKind === 'audiobook'),
  };
}
