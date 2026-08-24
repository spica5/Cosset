import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { createDocumentationDocument } from 'src/models/documentation-document';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const document = body?.document;

    if (!document?.title?.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!document?.customerId || !String(document.customerId).trim()) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const fileUrl = String(document.fileUrl || '').trim();
    if (!fileUrl) {
      return response({ message: 'A document file is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createDocumentationDocument({
      customerId: String(document.customerId).trim(),
      title: document.title.trim(),
      description: document.description ?? null,
      category: document.category ?? null,
      fileUrl,
      fileType: document.fileType ?? 'file',
      originalFileName: document.originalFileName ?? null,
      fileSizeBytes: document.fileSizeBytes ?? 0,
      isFavorite: document.isFavorite ?? 0,
      order: document.order ?? null,
    });

    return response({ document: created }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Create', error as Error);
  }
}
