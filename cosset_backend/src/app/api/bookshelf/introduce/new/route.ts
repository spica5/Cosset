import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createBookshelfIntroduce } from 'src/models/bookshelf-introduce';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const book = body?.book;

    if (!book?.title?.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!book?.fileUrl?.trim()) {
      return response({ message: 'File URL is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createBookshelfIntroduce({
      title: book.title.trim(),
      author: book.author ?? null,
      description: book.description ?? null,
      coverImage: book.coverImage ?? null,
      fileUrl: book.fileUrl.trim(),
      order: book.order ?? null,
    });

    return response({ book: created }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Introduce - Create', error as Error);
  }
}
