import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllCollections } from 'src/models/collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const limit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const collections = await getAllCollections(
      customerId,
      Number.isNaN(limit) ? 50 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ collections }, STATUS.OK);
  } catch (error) {
    return handleError('Collection - Get list', error as Error);
  }
}
