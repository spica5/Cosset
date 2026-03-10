import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCollection } from 'src/models/collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const collection = body?.collection;

    if (!collection?.name) {
      return response({ message: 'Name is required' }, STATUS.BAD_REQUEST);
    }

    const newCollection = await createCollection({
      customerId: collection.customerId ?? null,
      name: collection.name,
      description: collection.description ?? null,
      category: collection.category ?? null,
      reference: collection.reference ?? null,
      order: collection.order ?? null,
    });

    return response({ collection: newCollection }, STATUS.OK);
  } catch (error) {
    return handleError('Collection - Create', error as Error);
  }
}
