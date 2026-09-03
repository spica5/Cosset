import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { getBrandStoreById } from 'src/models/brand-stores';
import {
  toggleBrandStoreFavorite,
  getUserBrandStoreFavorites,
} from 'src/models/brand-store-favorites';

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

    const favoriteIds = await getUserBrandStoreFavorites(userId);

    return response({ favoriteIds }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store Favorite - List', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const brandStoreId = Number.parseInt(String(body?.brandStoreId ?? body?.storeId ?? ''), 10);

    if (Number.isNaN(brandStoreId) || brandStoreId <= 0) {
      return response({ message: 'Invalid brand store id' }, STATUS.BAD_REQUEST);
    }

    const store = await getBrandStoreById(brandStoreId);
    if (!store) {
      return response({ message: 'Brand store not found' }, STATUS.NOT_FOUND);
    }

    const result = await toggleBrandStoreFavorite(brandStoreId, userId);

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store Favorite - Toggle', error as Error);
  }
}
