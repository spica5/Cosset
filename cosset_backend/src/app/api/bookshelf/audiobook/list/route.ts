import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllBookshelfAudiobooks } from 'src/models/bookshelf-audiobook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const audiobooks = await getAllBookshelfAudiobooks(
      Number.isNaN(limit) ? 100 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ audiobooks }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Audio-book - Get list', error as Error);
  }
}
