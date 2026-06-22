import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createBookshelfEbook } from 'src/models/bookshelf-ebook';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ebook = body?.ebook;

    if (!ebook?.title?.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!ebook?.fileUrl?.trim()) {
      return response({ message: 'File is required' }, STATUS.BAD_REQUEST);
    }

    if (!ebook?.customerId || !String(ebook.customerId).trim()) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createBookshelfEbook({
      customerId: String(ebook.customerId).trim(),
      title: ebook.title.trim(),
      author: ebook.author ?? null,
      description: ebook.description ?? null,
      coverImage: ebook.coverImage ?? null,
      fileUrl: ebook.fileUrl.trim(),
      fileType: ebook.fileType ?? 'pdf',
      order: ebook.order ?? null,
    });

    return response({ ebook: created }, STATUS.OK);
  } catch (error) {
    return handleError('Bookshelf E-book - Create', error as Error);
  }
}
