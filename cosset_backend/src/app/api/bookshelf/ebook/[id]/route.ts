import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getBookshelfEbookById,
  updateBookshelfEbook,
  deleteBookshelfEbook,
} from 'src/models/bookshelf-ebook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ebookId = Number.parseInt(id, 10);

    if (Number.isNaN(ebookId)) {
      return response({ message: 'Invalid e-book id' }, STATUS.BAD_REQUEST);
    }

    const ebook = await getBookshelfEbookById(ebookId);

    if (!ebook) {
      return response({ message: 'E-book not found' }, STATUS.NOT_FOUND);
    }

    return response({ ebook }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ebookId = Number.parseInt(id, 10);

    if (Number.isNaN(ebookId)) {
      return response({ message: 'Invalid e-book id' }, STATUS.BAD_REQUEST);
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
      return response({ message: 'File is required' }, STATUS.BAD_REQUEST);
    }

    const ebook = await updateBookshelfEbook(ebookId, {
      title: updates.title,
      author: updates.author,
      description: updates.description,
      coverImage: updates.coverImage,
      fileUrl: updates.fileUrl,
      fileType: updates.fileType,
      order: updates.order,
      isPublic: updates.isPublic,
    });

    return response({ ebook }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ebookId = Number.parseInt(id, 10);

    if (Number.isNaN(ebookId)) {
      return response({ message: 'Invalid e-book id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteBookshelfEbook(ebookId);

    if (!deleted) {
      return response({ message: 'E-book not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'E-book deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book - Delete', error as Error);
  }
}
