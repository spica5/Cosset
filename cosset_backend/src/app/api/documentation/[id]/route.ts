import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  getDocumentationDocumentById,
  updateDocumentationDocument,
  deleteDocumentationDocument,
} from 'src/models/documentation-document';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (Number.isNaN(documentId)) {
      return response({ message: 'Invalid document id' }, STATUS.BAD_REQUEST);
    }

    const document = await getDocumentationDocumentById(documentId);
    if (!document) {
      return response({ message: 'Document not found' }, STATUS.NOT_FOUND);
    }

    return response({ document }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (Number.isNaN(documentId)) {
      return response({ message: 'Invalid document id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.fileUrl !== undefined && !String(updates.fileUrl || '').trim()) {
      return response({ message: 'A document file is required' }, STATUS.BAD_REQUEST);
    }

    const document = await updateDocumentationDocument(documentId, {
      title: updates.title,
      description: updates.description,
      category: updates.category,
      fileUrl: updates.fileUrl,
      fileType: updates.fileType,
      originalFileName: updates.originalFileName,
      fileSizeBytes: updates.fileSizeBytes,
      isFavorite: updates.isFavorite,
      order: updates.order,
    });

    if (!document) {
      return response({ message: 'Document not found' }, STATUS.NOT_FOUND);
    }

    return response({ document }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Update', error as Error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (Number.isNaN(documentId)) {
      return response({ message: 'Invalid document id' }, STATUS.BAD_REQUEST);
    }

    const existing = await getDocumentationDocumentById(documentId);
    if (!existing) {
      return response({ message: 'Document not found' }, STATUS.NOT_FOUND);
    }

    const deleted = await deleteDocumentationDocument(documentId);
    if (!deleted) {
      return response({ message: 'Document not found' }, STATUS.NOT_FOUND);
    }

    return response({ ok: true, document: existing }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Delete', error as Error);
  }
}
