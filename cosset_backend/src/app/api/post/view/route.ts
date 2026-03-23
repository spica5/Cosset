import type { NextRequest } from 'next/server';

import { createHash } from 'node:crypto';

import { JWT_SECRET } from 'src/config-global';
import { markPostAsViewed } from 'src/models/post-reactions';
import { getCommunityPostById, incrementCommunityPostViews } from 'src/models/community-posts';
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
 * POST /api/post/view
 * Body: { postId: number }
 * Records a view for the given community post.
 * Increments total_views only if this customer has not viewed the post before.
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawId = body?.postId;

    if (rawId === undefined || rawId === null) {
      return response({ message: 'postId is required' }, STATUS.BAD_REQUEST);
    }

    const postId = parseStrictInteger(rawId);

    if (postId === null || postId <= 0) {
      return response({ message: 'postId must be a positive integer' }, STATUS.BAD_REQUEST);
    }

    const existingPost = await getCommunityPostById(postId);

    if (!existingPost) {
      return response({ message: 'Community post not found' }, STATUS.NOT_FOUND);
    }

    const viewerCustomerId = await getCustomerIdFromToken(req);

    // No viewer identity available: count as a view event unconditionally.
    if (viewerCustomerId === null) {
      const totalViews = await incrementCommunityPostViews(postId);

      return response({ totalViews, alreadyViewed: false, viewedAt: null }, STATUS.OK);
    }

    const viewState = await markPostAsViewed({
      targetType: 'community',
      targetId: postId,
      customerId: viewerCustomerId,
    });

    if (viewState.isFirstView) {
      const totalViews = await incrementCommunityPostViews(postId);

      return response({ totalViews, alreadyViewed: false, viewedAt: viewState.viewedAt }, STATUS.OK);
    }

    const latestPost = await getCommunityPostById(postId);

    const latestTotalViews =
      typeof latestPost?.totalViews === 'number' && Number.isFinite(latestPost.totalViews)
        ? Math.max(0, Math.trunc(latestPost.totalViews))
        : 0;

    return response({ totalViews: latestTotalViews, alreadyViewed: true, viewedAt: viewState.viewedAt }, STATUS.OK);
  } catch (error) {
    return handleError('Community Post - Record view', error as Error);
  }
}
