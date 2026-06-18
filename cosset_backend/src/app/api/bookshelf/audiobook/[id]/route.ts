import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getBookshelfAudiobookById,
  updateBookshelfAudiobook,
  deleteBookshelfAudiobook,
} from 'src/models/bookshelf-audiobook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const audiobookId = Number.parseInt(id, 10);

    if (Number.isNaN(audiobookId)) {
      return response({ message: 'Invalid audio-book id' }, STATUS.BAD_REQUEST);
    }

    const audiobook = await getBookshelfAudiobookById(audiobookId);

    if (!audiobook) {
      return response({ message: 'Audio-book not found' }, STATUS.NOT_FOUND);
    }

    return response({ audiobook }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Audio-book - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const audiobookId = Number.parseInt(id, 10);

    if (Number.isNaN(audiobookId)) {
      return response({ message: 'Invalid audio-book id' }, STATUS.BAD_REQUEST);
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
      return response({ message: 'Audio file is required' }, STATUS.BAD_REQUEST);
    }

    const audiobook = await updateBookshelfAudiobook(audiobookId, {
      title: updates.title,
      author: updates.author,
      description: updates.description,
      coverImage: updates.coverImage,
      fileUrl: updates.fileUrl,
      fileType: updates.fileType,
      order: updates.order,
    });

    return response({ audiobook }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Audio-book - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const audiobookId = Number.parseInt(id, 10);

    if (Number.isNaN(audiobookId)) {
      return response({ message: 'Invalid audio-book id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteBookshelfAudiobook(audiobookId);

    if (!deleted) {
      return response({ message: 'Audio-book not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Audio-book deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Audio-book - Delete', error as Error);
  }
}
