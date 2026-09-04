import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { getBrandStoreById, getBrandStoreByOwner } from 'src/models/brand-stores';
import { getBrandProductById } from 'src/models/brand-products';
import {
  toggleBrandProductWishlist,
  getUserBrandProductWishlist,
  getUserBrandProductWishlistIds,
  getUserWishlistProductIdsForStore,
  getBrandStoreWishlistEntries,
  updateBrandStoreWishlistNote,
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
    const forOwner = req.nextUrl.searchParams.get('forOwner') === '1';

    if (forOwner) {
      const store = await getBrandStoreByOwner(userId);
      if (!store) {
        return response({ items: [], clientCount: 0 }, STATUS.OK);
      }

      const items = await getBrandStoreWishlistEntries(store.id);
      const clientCount = new Set(items.map((item) => item.userId)).size;
      return response({ items, clientCount, store }, STATUS.OK);
    }

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

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const wishlistId = Number.parseInt(String(body?.wishlistId ?? body?.id ?? ''), 10);
    const note = body?.note !== undefined ? String(body.note ?? '') : undefined;
    const statusRaw = body?.status !== undefined ? String(body.status ?? '') : undefined;
    const purchasedAtRaw = body?.purchasedAt ?? body?.createdAt;
    const purchasedAt =
      purchasedAtRaw === undefined || purchasedAtRaw === null
        ? purchasedAtRaw
        : String(purchasedAtRaw);

    if (Number.isNaN(wishlistId) || wishlistId <= 0) {
      return response({ message: 'Invalid wishlist id' }, STATUS.BAD_REQUEST);
    }

    if (note === undefined) {
      return response({ message: 'note is required' }, STATUS.BAD_REQUEST);
    }

    const allowedStatuses = new Set(['wish', 'purchased', 'canceled', 'cancelled']);
    if (statusRaw !== undefined && !allowedStatuses.has(statusRaw.trim().toLowerCase())) {
      return response(
        { message: 'Invalid status. Use wish, purchased, or canceled' },
        STATUS.BAD_REQUEST,
      );
    }

    if (purchasedAt !== undefined && purchasedAt !== null) {
      const parsed = new Date(purchasedAt);
      if (Number.isNaN(parsed.getTime())) {
        return response({ message: 'Invalid purchased date' }, STATUS.BAD_REQUEST);
      }
    }

    const store = await getBrandStoreByOwner(userId);
    if (!store) {
      return response({ message: 'Brand store not found' }, STATUS.NOT_FOUND);
    }

    const item = await updateBrandStoreWishlistNote(
      wishlistId,
      store.id,
      note,
      purchasedAt === undefined ? undefined : purchasedAt,
      statusRaw,
    );
    if (!item) {
      return response({ message: 'Wishlist item not found' }, STATUS.NOT_FOUND);
    }

    return response({ item }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product Wishlist - Update note', error as Error);
  }
}
