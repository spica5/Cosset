import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createGift } from 'src/models/gifts';
import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

// Disable Next.js route caching for this API.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const normalizeGiftOpenness = (value: unknown): 0 | 1 => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'public' || normalized === '1' || normalized === 'true') {
      return 1;
    }

    if (normalized === 'private' || normalized === '0' || normalized === 'false') {
      return 0;
    }
  }

  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return 0;
};

// ----------------------------------------------------------------------

/**
 * Create a new gift
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gift = body?.gift;

    if (!gift || !gift.title) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    // try to infer user from authorization header if not provided
    let inferredUserId: string | null = null;
    const authorization = req.headers.get('authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      const accessToken = authorization.split(' ')[1];
      try {
        const data = await verify(accessToken, JWT_SECRET);
        if (data?.userId) {
          inferredUserId = data.userId;
        }
      } catch (err) {
        // ignore verification errors; we'll fall back to gift.userId
      }
    }

    const newGift= await createGift({
      userId: gift.userId || inferredUserId || null,
      title: gift.title,
      description: gift.description || null,
      sendTo: gift.sendTo || null,
      receivedFrom: gift.receivedFrom || null,
      eventAt: gift.eventAt || gift.receivedDate || null,
      category: gift.category || null,
      images: gift.images ?? null,
      openness: normalizeGiftOpenness(gift.openness),
    });

    return response({ gift: newGift }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Create', error as Error);
  }
}

