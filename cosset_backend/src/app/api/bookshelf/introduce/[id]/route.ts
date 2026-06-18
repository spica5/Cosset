import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getBookshelfIntroduceById,
  updateBookshelfIntroduce,
  deleteBookshelfIntroduce,
} from 'src/models/bookshelf-introduce';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = Number.parseInt(id, 10);

    if (Number.isNaN(bookId)) {
      return response({ message: 'Invalid book id' }, STATUS.BAD_REQUEST);
    }

    const book = await getBookshelfIntroduceById(bookId);

    if (!book) {
      return response({ message: 'Book not found' }, STATUS.NOT_FOUND);
    }

    return response({ book }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Introduce - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = Number.parseInt(id, 10);

    if (Number.isNaN(bookId)) {
      return response({ message: 'Invalid book id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.fileUrl !== undefined && !String(updates.fileUrl).trim()) {
      return response({ message: 'File URL is required' }, STATUS.BAD_REQUEST);
    }

    const book = await updateBookshelfIntroduce(bookId, {
      title: updates.title,
      author: updates.author,
      description: updates.description,
      coverImage: updates.coverImage,
      fileUrl: updates.fileUrl,
      order: updates.order,
    });

    return response({ book }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Introduce - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = Number.parseInt(id, 10);

    if (Number.isNaN(bookId)) {
      return response({ message: 'Invalid book id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteBookshelfIntroduce(bookId);

    if (!deleted) {
      return response({ message: 'Book not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Book deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Introduce - Delete', error as Error);
  }
}
