import type { NextRequest } from 'next/server';

import { createHash } from 'node:crypto';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';
import { incrementGiftViews, getGiftIdsByFilters, getGiftById } from 'src/models/gifts';
import { markPostAsViewed, getViewedPostIdsByCustomer } from 'src/models/post-reactions';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const parseStrictInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim();

    if (!/^-?\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

const normalizeViewCount = (value: unknown): number => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.trunc(parsed));
  }

  return 0;
};

const normalizeCustomerId = (value: unknown): number | null => {
  const numeric = parseStrictInteger(value);
  if (numeric !== null) {
    return numeric;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const digest = createHash('sha256').update(normalized).digest('hex');
  const hashed = Number.parseInt(digest.slice(0, 13), 16);

  if (!Number.isSafeInteger(hashed)) {
    return null;
  }

  return hashed;
};

const getCustomerIdFromToken = async (req: NextRequest): Promise<number | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return normalizeCustomerId(data?.userId);
  } catch {
    return null;
  }
};

const getNonEmptyQueryParam = (req: NextRequest, key: string): string | undefined => {
  const value = req.nextUrl.searchParams.get(key);

  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

/** **************************************
 * GET /api/gift/view?ownerCustomerId=<customerId>
 * Returns viewed gift ids for the logged-in visitor.
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const viewerCustomerId = await getCustomerIdFromToken(req);

    if (viewerCustomerId === null) {
      return response({ viewedGiftIds: [] }, STATUS.OK);
    }

    const ownerCustomerId = getNonEmptyQueryParam(req, 'ownerCustomerId');
    const openness = getNonEmptyQueryParam(req, 'openness');
    const category = getNonEmptyQueryParam(req, 'category');

    let viewedGiftIds = await getViewedPostIdsByCustomer('drawer', viewerCustomerId, ownerCustomerId);

    if (ownerCustomerId && (openness !== undefined || category !== undefined)) {
      const filteredGiftIds = await getGiftIdsByFilters(ownerCustomerId, openness, category);
      const allowedIdSet = new Set(filteredGiftIds.map(String));

      viewedGiftIds = viewedGiftIds.filter((id) => allowedIdSet.has(String(id)));
    }

    return response({ viewedGiftIds }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Get viewed ids', error as Error);
  }
}

/** **************************************
 * POST /api/gift/view
 * Body: { giftId: number }
 * Records a view for the given gift.
 * Increments total_views only if this customer has not viewed the gift before.
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawId = body?.giftId;

    if (rawId === undefined || rawId === null) {
      return response({ message: 'giftId is required' }, STATUS.BAD_REQUEST);
    }

    const giftId = parseStrictInteger(rawId);

    if (giftId === null || giftId <= 0) {
      return response({ message: 'giftId must be a positive integer' }, STATUS.BAD_REQUEST);
    }

    const existingGift = await getGiftById(giftId);

    if (!existingGift) {
      return response({ message: 'Gift not found' }, STATUS.NOT_FOUND);
    }

    const viewerCustomerId = await getCustomerIdFromToken(req);

    if (viewerCustomerId === null) {
      const totalViews = normalizeViewCount(await incrementGiftViews(giftId));

      return response({ totalViews, alreadyViewed: false, viewedAt: null }, STATUS.OK);
    }

    const viewState = await markPostAsViewed({
      targetType: 'drawer',
      targetId: giftId,
      customerId: viewerCustomerId,
    });

    if (viewState.isFirstView) {
      const totalViews = normalizeViewCount(await incrementGiftViews(giftId));

      return response(
        {
          totalViews,
          alreadyViewed: false,
          viewedAt: viewState.viewedAt,
        },
        STATUS.OK,
      );
    }

    const latestGift = await getGiftById(giftId);
    const latestTotalViews = normalizeViewCount(latestGift?.totalViews);

    return response(
      {
        totalViews: latestTotalViews,
        alreadyViewed: true,
        viewedAt: viewState.viewedAt,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Gift - Record view', error as Error);
  }
}
