import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import {
  createBookshelfEbookBookmark,
  getBookshelfEbookBookmarks,
} from 'src/models/bookshelf-ebook-reading';
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
  bodyCustomerId?: unknown,
): Promise<string | null> => {
  const tokenCustomerId = await getCustomerIdFromToken(req);

  if (tokenCustomerId) {
    return tokenCustomerId;
  }

  if (typeof bodyCustomerId === 'string' && bodyCustomerId.trim()) {
    return bodyCustomerId.trim();
  }

  return null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const bookId = parseInteger(searchParams.get('bookId'));
    const customerId = await resolveCustomerId(req, searchParams.get('customerId'));

    if (bookId === null) {
      return response({ message: 'bookId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    if (!customerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const bookmarks = await getBookshelfEbookBookmarks(bookId, customerId);

    return response({ bookmarks }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book Bookmarks - List', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    const bookId = parseInteger(body.bookId);
    const customerId = await resolveCustomerId(req, body.customerId);

    if (bookId === null) {
      return response({ message: 'bookId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    if (!customerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const bookmark = await createBookshelfEbookBookmark({
      bookId,
      customerId,
      pageNumber: parseInteger(body.pageNumber),
      scrollPosition:
        body.scrollPosition === undefined || body.scrollPosition === null
          ? null
          : Number(body.scrollPosition),
      label: typeof body.label === 'string' ? body.label : null,
    });

    return response({ bookmark }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book Bookmarks - Create', error as Error);
  }
}
