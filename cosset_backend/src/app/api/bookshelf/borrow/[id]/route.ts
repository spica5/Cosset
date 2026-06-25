import type { NextRequest } from 'next/server';

import { getUserById } from 'src/models/users';
import { createNotification } from 'src/models/notifications';
import { updateBookshelfBorrowStatus, BOOKSHELF_BORROW_PERIOD_DAYS } from 'src/models/bookshelf-borrow';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const borrowId = Number(id);
    const body = await req.json();
    const actorCustomerId = String(body?.actorCustomerId || '').trim();
    const status = body?.status;

    if (!Number.isFinite(borrowId)) {
      return response({ message: 'Invalid borrow request id' }, STATUS.BAD_REQUEST);
    }

    if (!UUID_REGEX.test(actorCustomerId)) {
      return response({ message: 'actorCustomerId is required and must be a valid UUID' }, STATUS.BAD_REQUEST);
    }

    if (
      status !== 'approved' &&
      status !== 'rejected' &&
      status !== 'returned' &&
      status !== 'cancelled'
    ) {
      return response(
        { message: "status must be 'approved', 'rejected', 'returned', or 'cancelled'" },
        STATUS.BAD_REQUEST,
      );
    }

    const borrow = await updateBookshelfBorrowStatus({
      id: borrowId,
      actorCustomerId,
      status,
    });

    if (!borrow) {
      return response(
        { message: 'Borrow request not found or status transition is not allowed' },
        STATUS.NOT_FOUND,
      );
    }

    if (status === 'approved' || status === 'rejected') {
      try {
        const owner = await getUserById(borrow.ownerCustomerId);
        const ownerName =
          `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() ||
          owner?.email ||
          'The owner';

        const approved = status === 'approved';

        await createNotification({
          customerId: borrow.borrowerCustomerId,
          avatarUrl: owner?.photoURL || null,
          type: 1,
          category: 1,
          isUnRead: true,
          isArchived: false,
          title: approved
            ? `<p><strong>${ownerName}</strong> approved your borrow request</p>`
            : `<p><strong>${ownerName}</strong> declined your borrow request</p>`,
          content: approved
            ? `${ownerName} approved your borrow request. The book is on your bookshelf for ${BOOKSHELF_BORROW_PERIOD_DAYS} days.`
            : `${ownerName} declined your borrow request.`,
        });
      } catch (notificationError) {
        console.error('[Bookshelf Borrow - Respond] failed to create notification', notificationError);
      }
    }

    return response({ borrow }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Borrow - Respond request', error as Error);
  }
}
