import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCollectionById,
  updateCollection,
  deleteCollection,
} from 'src/models/collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const collectionId = Number.parseInt(id, 10);

    if (Number.isNaN(collectionId)) {
      return response({ message: 'Invalid collection id' }, STATUS.BAD_REQUEST);
    }

    const collection = await getCollectionById(collectionId);

    if (!collection) {
      return response({ message: 'Collection not found' }, STATUS.NOT_FOUND);
    }

    return response({ collection }, STATUS.OK);
  } catch (error) {
    return handleError('Collection - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const collectionId = Number.parseInt(id, 10);

    if (Number.isNaN(collectionId)) {
      return response({ message: 'Invalid collection id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const collection = await updateCollection(collectionId, {
      customerId: updates.customerId,
      name: updates.name,
      description: updates.description,
      category: updates.category,
      reference: updates.reference,
      order: updates.order,
    });

    return response({ collection }, STATUS.OK);
  } catch (error) {
    return handleError('Collection - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const collectionId = Number.parseInt(id, 10);

    if (Number.isNaN(collectionId)) {
      return response({ message: 'Invalid collection id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCollection(collectionId);

    if (!deleted) {
      return response({ message: 'Collection not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Collection deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Collection - Delete', error as Error);
  }
}
