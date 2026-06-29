import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getBookshelfEbookReadingCounts } from 'src/models/bookshelf-ebook-reading';
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

const resolveCustomerId = async (
  req: NextRequest,
  queryCustomerId?: string | null,
): Promise<string | null> => {
  const tokenCustomerId = await getCustomerIdFromToken(req);

  if (tokenCustomerId) {
    return tokenCustomerId;
  }

  if (queryCustomerId?.trim()) {
    return queryCustomerId.trim();
  }

  return null;
};

const parseBookIds = (raw: string | null): number[] => {
  if (!raw?.trim()) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(',')
        .map((part) => parseInteger(part.trim()))
        .filter((id): id is number => id !== null),
    ),
  ];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const bookIds = parseBookIds(searchParams.get('bookIds'));
    const customerId = await resolveCustomerId(req, searchParams.get('customerId'));

    if (!customerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    if (!bookIds.length) {
      return response({ counts: [] }, STATUS.OK);
    }

    const counts = await getBookshelfEbookReadingCounts(bookIds, customerId);

    return response({ counts }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book Reading Counts - List', error as Error);
  }
}
