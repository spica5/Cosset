import type { NextRequest } from 'next/server';

import { getCoffeeShopById } from 'src/models/coffee-shops';
import { getCoffeeShopMenuItems } from 'src/utils/coffee-shop-menu';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const coffeeShop = await getCoffeeShopById(coffeeShopId);

    if (!coffeeShop) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    const items = getCoffeeShopMenuItems(coffeeShop.menu, coffeeShop.files);

    return response({ items }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Menu - Get', error as Error);
  }
}
