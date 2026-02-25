import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createGift } from 'src/models/gifts';

// Disable Next.js route caching for this API.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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

    const newGift= await createGift({
      userId: gift.userId || null,
      title: gift.title,
      description: gift.description || null,
      receivedFrom: gift.receivedFrom || null,
      receivedDate: gift.receivedDate || null,
      category: gift.category || null,
      images: gift.images ?? null,
    });

    return response({ gift: newGift }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Create', error as Error);
  }
}

