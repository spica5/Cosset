import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { listUserCoffeeShops } from 'src/models/coffee-shop-presence';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const shops = await listUserCoffeeShops(userId);

    // Return the first active shop or null
    const coffeeShopId = shops.length ? shops[0] : null;

    return response({ coffeeShopId }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Presence - Me', error as Error);
  }
}
