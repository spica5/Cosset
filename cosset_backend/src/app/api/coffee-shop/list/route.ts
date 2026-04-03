import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllCoffeeShops } from 'src/models/coffee-shops';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const coffeeShops = await getAllCoffeeShops(
      Number.isNaN(limit) ? 100 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ coffeeShops }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop - Get list', error as Error);
  }
}
