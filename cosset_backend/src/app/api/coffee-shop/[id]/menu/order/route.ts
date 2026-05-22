import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getCoffeeShopById } from 'src/models/coffee-shops';
import { createCoffeeShopOrder } from 'src/models/coffee-shop-orders';
import { getUserById } from 'src/models/users';
import { getCoffeeShopMenuItems } from 'src/utils/coffee-shop-menu';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
};

export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const menuItemId = typeof body?.menuItemId === 'string' ? body.menuItemId.trim() : '';
    const quantityRaw = Number(body?.quantity ?? 1);
    const quantity =
      Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.min(99, Math.trunc(quantityRaw)) : 1;

    if (!menuItemId) {
      return response({ message: 'menuItemId is required' }, STATUS.BAD_REQUEST);
    }

    const items = getCoffeeShopMenuItems(coffeeShop.menu, coffeeShop.files);
    const menuItem = items.find((item) => item.id === menuItemId);

    if (!menuItem) {
      return response({ message: 'Menu item not found' }, STATUS.NOT_FOUND);
    }

    const userId = await getUserIdFromRequest(req);
    let customerName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';

    if (userId) {
      const user = await getUserById(userId);
      const fromProfile =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.email?.split('@')[0] ||
        'Member';
      customerName = customerName || fromProfile;
    } else if (!customerName) {
      return response({ message: 'Display name is required for guests' }, STATUS.BAD_REQUEST);
    }

    const order = await createCoffeeShopOrder({
      coffeeShopId,
      customerId: userId,
      customerName,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      menuItemImage: menuItem.imageUrl,
      quantity,
    });

    return response(
      {
        order,
        menuItem,
        message: `Ordered ${quantity} × ${menuItem.name}`,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Coffee Shop Menu - Order', error as Error);
  }
}
