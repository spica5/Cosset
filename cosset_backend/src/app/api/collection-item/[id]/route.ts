import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCollectionItemById,
  updateCollectionItem,
  deleteCollectionItem,
} from 'src/models/collection-items';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number.parseInt(id, 10);

    if (Number.isNaN(itemId)) {
      return response({ message: 'Invalid item id' }, STATUS.BAD_REQUEST);
    }

    const item = await getCollectionItemById(itemId);
    if (!item) {
      return response({ message: 'Collection item not found' }, STATUS.NOT_FOUND);
    }

    return response({ item, collectionItem: item }, STATUS.OK);
  } catch (error) {
    return handleError('Collection Item - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number.parseInt(id, 10);

    if (Number.isNaN(itemId)) {
      return response({ message: 'Invalid item id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const item = await updateCollectionItem(itemId, {
      customerId: updates.customerId,
      collectionId: updates.collectionId,
      title: updates.title,
      category: updates.category,
      description: updates.description,
      isPublic: updates.isPublic,
      date: updates.date,
      images: updates.images,
      videos: updates.videos,
      files: updates.files,
    });

    return response({ item, collectionItem: item }, STATUS.OK);
  } catch (error) {
    return handleError('Collection Item - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number.parseInt(id, 10);

    if (Number.isNaN(itemId)) {
      return response({ message: 'Invalid item id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCollectionItem(itemId);
    if (!deleted) {
      return response({ message: 'Collection item not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Collection item deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Collection Item - Delete', error as Error);
  }
}
