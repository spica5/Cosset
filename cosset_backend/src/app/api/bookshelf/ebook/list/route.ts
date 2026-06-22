import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllBookshelfEbooks } from 'src/models/bookshelf-ebook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const ebooks = await getAllBookshelfEbooks(
      searchParams.get('customerId') ?? undefined,
      Number.isNaN(limit) ? 100 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ ebooks }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book - Get list', error as Error);
  }
}
