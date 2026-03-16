import type { NextRequest } from 'next/server';

import { createHash } from 'node:crypto';

import { JWT_SECRET } from 'src/config-global';
import { getViewedPostIdsByCustomer, markPostAsViewed } from 'src/models/post-reactions';
import { getAlbumById, incrementAlbumViews } from 'src/models/albums';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

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

  // Derive a stable positive integer for non-numeric identifiers (e.g. UUID auth IDs).
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

/** **************************************
 * GET /api/album/view?ownerUserId=<userId>
 * Returns viewed album ids for the logged-in visitor, sourced from viewed_at records.
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const viewerCustomerId = await getCustomerIdFromToken(req);

    if (viewerCustomerId === null) {
      return response({ viewedAlbumIds: [] }, STATUS.OK);
    }

    const ownerUserId = req.nextUrl.searchParams.get('ownerUserId') ?? undefined;

    const viewedAlbumIds = await getViewedPostIdsByCustomer('album', viewerCustomerId, ownerUserId);

    return response({ viewedAlbumIds }, STATUS.OK);
  } catch (error) {
    return handleError('Album - Get viewed ids', error as Error);
  }
}

/** **************************************
 * POST /api/album/view
 * Body: { albumId: number }
 * Records a view for the given album.
 * Increments total_views only if this customer has not viewed the album before.
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawId = body?.albumId;

    if (rawId === undefined || rawId === null) {
      return response({ message: 'albumId is required' }, STATUS.BAD_REQUEST);
    }

    const albumId = parseStrictInteger(rawId);

    if (albumId === null || albumId <= 0) {
      return response({ message: 'albumId must be a positive integer' }, STATUS.BAD_REQUEST);
    }

    const existingAlbum = await getAlbumById(albumId);

    if (!existingAlbum) {
      return response({ message: 'Album not found' }, STATUS.NOT_FOUND);
    }

    const viewerCustomerId = await getCustomerIdFromToken(req);

    // No viewer identity available: keep legacy behavior and count as a view event.
    if (viewerCustomerId === null) {
      const totalViews = await incrementAlbumViews(albumId);

      return response({ totalViews, alreadyViewed: false, viewedAt: null }, STATUS.OK);
    }

    const viewState = await markPostAsViewed({
      targetType: 'album',
      targetId: albumId,
      customerId: viewerCustomerId,
    });

    if (viewState.isFirstView) {
      const totalViews = await incrementAlbumViews(albumId);

      return response(
        {
          totalViews,
          alreadyViewed: false,
          viewedAt: viewState.viewedAt,
        },
        STATUS.OK,
      );
    }

    const latestAlbum = await getAlbumById(albumId);

    const latestTotalViews =
      typeof latestAlbum?.totalViews === 'number' && Number.isFinite(latestAlbum.totalViews)
        ? Math.max(0, Math.trunc(latestAlbum.totalViews))
        : 0;

    return response(
      {
        totalViews: latestTotalViews,
        alreadyViewed: true,
        viewedAt: viewState.viewedAt,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Album - Record view', error as Error);
  }
}
