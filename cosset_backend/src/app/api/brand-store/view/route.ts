import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import {
  getBrandStoreById,
  incrementBrandStoreViews,
} from 'src/models/brand-stores';
import { markBrandStoreViewed } from 'src/models/brand-store-views';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const parseStrictInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim();
    if (!/^-?\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

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

/** **************************************
 * POST /api/brand-store/view
 * Body: { brandStoreId | storeId: number }
 * Counts unique client visits (not the store owner).
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawId = body?.brandStoreId ?? body?.storeId;

    if (rawId === undefined || rawId === null) {
      return response({ message: 'brandStoreId is required' }, STATUS.BAD_REQUEST);
    }

    const brandStoreId = parseStrictInteger(rawId);

    if (brandStoreId === null || brandStoreId <= 0) {
      return response({ message: 'brandStoreId must be a positive integer' }, STATUS.BAD_REQUEST);
    }

    const store = await getBrandStoreById(brandStoreId);

    if (!store) {
      return response({ message: 'Brand store not found' }, STATUS.NOT_FOUND);
    }

    const viewerUserId = await getUserIdFromRequest(req);
    const currentViews =
      typeof store.totalViews === 'number' && Number.isFinite(store.totalViews)
        ? Math.max(0, Math.trunc(store.totalViews))
        : 0;

    // Anonymous visitors or the store owner do not increment visit counts.
    if (!viewerUserId || viewerUserId === store.ownerCustomerId) {
      return response(
        {
          totalViews: currentViews,
          alreadyViewed: true,
          viewedAt: null,
        },
        STATUS.OK,
      );
    }

    const viewState = await markBrandStoreViewed({
      brandStoreId,
      userId: viewerUserId,
    });

    if (viewState.isFirstView) {
      const totalViews = await incrementBrandStoreViews(brandStoreId);

      return response(
        {
          totalViews,
          alreadyViewed: false,
          viewedAt: viewState.viewedAt,
        },
        STATUS.OK,
      );
    }

    return response(
      {
        totalViews: currentViews,
        alreadyViewed: true,
        viewedAt: viewState.viewedAt,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Brand Store - Record view', error as Error);
  }
}
