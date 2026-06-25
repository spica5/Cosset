import type { NextRequest } from 'next/server';

import { getUserById } from 'src/models/users';
import { createNotification } from 'src/models/notifications';
import {
  BOOKSHELF_BORROW_PERIOD_DAYS,
  expireOverdueBorrows,
  listBookshelfBorrows,
} from 'src/models/bookshelf-borrow';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

async function notifyBorrowExpirations(
  expiredBorrows: Awaited<ReturnType<typeof expireOverdueBorrows>>,
) {
  await Promise.all(
    expiredBorrows.map(async (borrow) => {
      const bookLabel =
        borrow.bookKind === 'audiobook'
          ? `audiobook #${borrow.bookId}`
          : `e-book #${borrow.bookId}`;

      try {
        await createNotification({
          customerId: borrow.borrowerCustomerId,
          type: 1,
          category: 1,
          isUnRead: true,
          isArchived: false,
          title: '<p><strong>Borrow period ended</strong></p>',
          content: `Your borrow for ${bookLabel} has expired and was automatically returned.`,
        });
      } catch (error) {
        console.error('[Bookshelf Borrow - Expire] borrower notification failed', error);
      }

      try {
        const borrower = await getUserById(borrow.borrowerCustomerId);
        const borrowerName =
          `${borrower?.firstName || ''} ${borrower?.lastName || ''}`.trim() ||
          borrower?.email ||
          'A neighbor';

        await createNotification({
          customerId: borrow.ownerCustomerId,
          avatarUrl: borrower?.photoURL || null,
          type: 1,
          category: 1,
          isUnRead: true,
          isArchived: false,
          title: '<p><strong>Borrow period ended</strong></p>',
          content: `${borrowerName}'s borrow for ${bookLabel} has expired and was automatically returned.`,
        });
      } catch (error) {
        console.error('[Bookshelf Borrow - Expire] owner notification failed', error);
      }
    }),
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = (searchParams.get('customerId') || '').trim();
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const limit = Number.parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    if (!UUID_REGEX.test(customerId)) {
      return response({ message: 'customerId is required and must be a valid UUID' }, STATUS.BAD_REQUEST);
    }

    if (role !== 'borrower' && role !== 'owner' && role !== 'all') {
      return response({ message: "role must be 'borrower', 'owner', or 'all'" }, STATUS.BAD_REQUEST);
    }

    const expired = await expireOverdueBorrows();
    if (expired.length) {
      await notifyBorrowExpirations(expired);
    }

    const borrows = await listBookshelfBorrows({
      customerId,
      role: role as 'borrower' | 'owner' | 'all',
      status: status as
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'returned'
        | 'cancelled'
        | 'expired'
        | 'all',
      limit: Number.isNaN(limit) ? 100 : limit,
      offset: Number.isNaN(offset) ? 0 : offset,
    });

    return response({ borrows, borrowPeriodDays: BOOKSHELF_BORROW_PERIOD_DAYS }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Borrow - Get list', error as Error);
  }
}
