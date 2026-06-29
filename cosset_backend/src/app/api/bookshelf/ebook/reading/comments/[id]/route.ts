import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { deleteBookshelfEbookReadingComment } from 'src/models/bookshelf-ebook-reading';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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

const getCustomerIdFromToken = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
};

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const commentId = parseInteger(id);
    const customerId = await getCustomerIdFromToken(req);

    if (commentId === null) {
      return response({ message: 'Invalid comment id' }, STATUS.BAD_REQUEST);
    }

    if (!customerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const deleted = await deleteBookshelfEbookReadingComment(commentId, customerId);

    if (!deleted) {
      return response({ message: 'Comment not found' }, STATUS.NOT_FOUND);
    }

    return response({ success: true }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book Reading Comments - Delete', error as Error);
  }
}
