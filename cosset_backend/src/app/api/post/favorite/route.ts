import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';
import {
  toggleCommunityPostFavorite,
  getUserCommunityPostFavorites,
} from 'src/models/community-post-favorites';

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

    const favoriteIds = await getUserCommunityPostFavorites(userId);

    return response({ favoriteIds }, STATUS.OK);
  } catch (error) {
    return handleError('Community Post Favorite - List', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const postId = Number.parseInt(String(body?.postId ?? ''), 10);

    if (Number.isNaN(postId)) {
      return response({ message: 'Invalid post id' }, STATUS.BAD_REQUEST);
    }

    const result = await toggleCommunityPostFavorite(postId, userId);

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Community Post Favorite - Toggle', error as Error);
  }
}
