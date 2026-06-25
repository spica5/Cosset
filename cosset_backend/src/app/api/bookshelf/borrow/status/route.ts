import type { NextRequest } from 'next/server';

import { getBookshelfBorrowStatusesForViewer } from 'src/models/bookshelf-borrow';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const borrowerCustomerId = (searchParams.get('borrowerCustomerId') || '').trim();
    const ownerCustomerId = (searchParams.get('ownerCustomerId') || '').trim();
    const bookIdsParam = (searchParams.get('bookIds') || '').trim();

    if (!UUID_REGEX.test(borrowerCustomerId) || !UUID_REGEX.test(ownerCustomerId)) {
      return response(
        { message: 'borrowerCustomerId and ownerCustomerId must be valid UUIDs' },
        STATUS.BAD_REQUEST,
      );
    }

    const bookIds = bookIdsParam
      ? bookIdsParam
          .split(',')
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => Number.isFinite(value))
      : undefined;

    const borrows = await getBookshelfBorrowStatusesForViewer({
      borrowerCustomerId,
      ownerCustomerId,
      bookIds,
    });

    return response({ borrows }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Borrow - Get status', error as Error);
  }
}
