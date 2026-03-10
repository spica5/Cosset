import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getCollectionItems } from 'src/models/collection-items';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const collectionIdParam = searchParams.get('collectionId');
    const customerId = searchParams.get('customerId') ?? undefined;
    const limit = Number.parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    if (!collectionIdParam) {
      return response({ message: 'collectionId is required' }, STATUS.BAD_REQUEST);
    }

    const collectionId = Number.parseInt(collectionIdParam, 10);
    if (Number.isNaN(collectionId)) {
      return response({ message: 'Invalid collectionId' }, STATUS.BAD_REQUEST);
    }

    const items = await getCollectionItems(
      collectionId,
      customerId,
      Number.isNaN(limit) ? 100 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ items, collectionItems: items }, STATUS.OK);
  } catch (error) {
    return handleError('Collection Item - Get list', error as Error);
  }
}
