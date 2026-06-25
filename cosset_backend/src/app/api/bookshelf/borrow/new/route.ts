import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { createBookshelfBorrowRequest, normalizeBorrowPeriodDays } from 'src/models/bookshelf-borrow';
import { getUserById } from 'src/models/users';
import { createNotification } from 'src/models/notifications';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const borrowerCustomerId = String(body?.borrowerCustomerId || '').trim();
    const ownerCustomerId = String(body?.ownerCustomerId || '').trim();
    const bookKind = body?.bookKind;
    const bookId = Number(body?.bookId);

    if (!UUID_REGEX.test(borrowerCustomerId) || !UUID_REGEX.test(ownerCustomerId)) {
      return response(
        { message: 'borrowerCustomerId and ownerCustomerId must be valid UUIDs' },
        STATUS.BAD_REQUEST,
      );
    }

    if (bookKind !== 'ebook' && bookKind !== 'audiobook') {
      return response({ message: "bookKind must be 'ebook' or 'audiobook'" }, STATUS.BAD_REQUEST);
    }

    if (!Number.isFinite(bookId)) {
      return response({ message: 'bookId is required' }, STATUS.BAD_REQUEST);
    }

    const borrowPeriodDays = normalizeBorrowPeriodDays(body?.borrowPeriodDays);

    const borrow = await createBookshelfBorrowRequest({
      borrowerCustomerId,
      ownerCustomerId,
      bookKind,
      bookId,
      borrowPeriodDays,
    });

    try {
      const borrower = await getUserById(borrowerCustomerId);
      const borrowerName =
        `${borrower?.firstName || ''} ${borrower?.lastName || ''}`.trim() ||
        borrower?.email ||
        'Someone';

      await createNotification({
        customerId: ownerCustomerId,
        avatarUrl: borrower?.photoURL || null,
        type: 1,
        category: 1,
        isUnRead: true,
        isArchived: false,
        title: `<p><strong>${borrowerName}</strong> requested to borrow a book</p>`,
        content: `${borrowerName} requested to borrow ${
          borrow.bookKind === 'audiobook' ? 'an audiobook' : 'an e-book'
        } for ${borrow.borrowPeriodDays || 30} day(s) from your bookshelf`,
      });
    } catch (notificationError) {
      console.error('[Bookshelf Borrow - Create] failed to create notification', notificationError);
    }

    return response({ borrow }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (
        error.code === 'BORROW_REQUEST_EXISTS' ||
        error.code === 'BORROW_SELF' ||
        error.code === 'BORROW_BOOK_NOT_PUBLIC'
      ) {
        return response({ message: error.message }, STATUS.CONFLICT);
      }

      if (error.code === 'BORROW_BOOK_NOT_FOUND' || error.code === 'BORROW_INVALID_BOOK') {
        return response({ message: error.message }, STATUS.BAD_REQUEST);
      }
    }

    return handleError('Bookshelf Borrow - Create request', error as Error);
  }
}
