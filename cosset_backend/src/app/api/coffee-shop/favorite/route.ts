import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import {
  toggleCoffeeShopFavorite,
  getUserCoffeeShopFavorites,
} from 'src/models/coffee-shop-favorites';

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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const favoriteIds = await getUserCoffeeShopFavorites(userId);

    return response({ favoriteIds }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Favorite - List', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const coffeeShopId = Number.parseInt(String(body?.coffeeShopId ?? ''), 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const result = await toggleCoffeeShopFavorite(coffeeShopId, userId);

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Favorite - Toggle', error as Error);
  }
}
