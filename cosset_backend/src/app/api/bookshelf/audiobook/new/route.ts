import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createBookshelfAudiobook } from 'src/models/bookshelf-audiobook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audiobook = body?.audiobook;

    if (!audiobook?.title?.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!audiobook?.fileUrl?.trim()) {
      return response({ message: 'Audio file is required' }, STATUS.BAD_REQUEST);
    }

    if (!audiobook?.customerId || !String(audiobook.customerId).trim()) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createBookshelfAudiobook({
      customerId: String(audiobook.customerId).trim(),
      title: audiobook.title.trim(),
      author: audiobook.author ?? null,
      description: audiobook.description ?? null,
      coverImage: audiobook.coverImage ?? null,
      fileUrl: audiobook.fileUrl.trim(),
      fileType: audiobook.fileType ?? 'mp3',
      order: audiobook.order ?? null,
    });

    return response({ audiobook: created }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf Audio-book - Create', error as Error);
  }
}
