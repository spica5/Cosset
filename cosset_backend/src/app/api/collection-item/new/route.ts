import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCollectionItem } from 'src/models/collection-items';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = body?.item;

    if (!item?.collectionId) {
      return response({ message: 'collectionId is required' }, STATUS.BAD_REQUEST);
    }

    const collectionId = Number.parseInt(String(item.collectionId), 10);
    if (Number.isNaN(collectionId)) {
      return response({ message: 'Invalid collectionId' }, STATUS.BAD_REQUEST);
    }

    const newItem = await createCollectionItem({
      customerId: item.customerId ?? null,
      collectionId,
      title: item.title ?? null,
      category: item.category ?? null,
      description: item.description ?? null,
      isPublic: item.isPublic ?? 0,
      date: item.date ?? null,
      images: item.images ?? null,
      videos: item.videos ?? null,
      files: item.files ?? null,
    });

    return response({ item: newItem, collectionItem: newItem }, STATUS.OK);
  } catch (error) {
    return handleError('Collection Item - Create', error as Error);
  }
}
