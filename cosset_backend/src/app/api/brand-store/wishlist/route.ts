import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { getBrandStoreById } from 'src/models/brand-stores';
import { getBrandProductById } from 'src/models/brand-products';
import {
  toggleBrandProductWishlist,
  getUserBrandProductWishlist,
  getUserBrandProductWishlistIds,
  getUserWishlistProductIdsForStore,
} from 'src/models/brand-product-wishlists';

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

    const storeId = Number.parseInt(String(req.nextUrl.searchParams.get('storeId') || ''), 10);
    const idsOnly = req.nextUrl.searchParams.get('idsOnly') === '1';

    if (Number.isFinite(storeId) && storeId > 0) {
      const productIds = await getUserWishlistProductIdsForStore(storeId, userId);
      return response({ productIds }, STATUS.OK);
    }

    if (idsOnly) {
      const productIds = await getUserBrandProductWishlistIds(userId);
      return response({ productIds }, STATUS.OK);
    }

    const items = await getUserBrandProductWishlist(userId);
    return response({ items, productIds: items.map((item) => item.productId) }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product Wishlist - List', error as Error);
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
    const productId = Number.parseInt(String(body?.productId ?? ''), 10);

    if (Number.isNaN(brandStoreId) || brandStoreId <= 0) {
      return response({ message: 'Invalid brand store id' }, STATUS.BAD_REQUEST);
    }

    if (Number.isNaN(productId) || productId <= 0) {
      return response({ message: 'Invalid product id' }, STATUS.BAD_REQUEST);
    }

    const store = await getBrandStoreById(brandStoreId);
    if (!store) {
      return response({ message: 'Brand store not found' }, STATUS.NOT_FOUND);
    }

    const product = await getBrandProductById(productId);
    if (!product || Number(product.storeId) !== brandStoreId) {
      return response({ message: 'Product not found in this store' }, STATUS.NOT_FOUND);
    }

    if (String(store.ownerCustomerId) === String(userId)) {
      return response({ message: 'Store owners cannot wishlist their own products' }, STATUS.BAD_REQUEST);
    }

    const result = await toggleBrandProductWishlist(brandStoreId, productId, userId);

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product Wishlist - Toggle', error as Error);
  }
}
