import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllGifts } from 'src/models/gifts';

// Disable Next.js route caching for this API.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

/**
 * Get list of gift
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    // support both `customerId` (used elsewhere) and `userId` (UUID)
    const customerId = searchParams.get('customerId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // prefer customerId if provided for backward compatibility
    const ownerId = customerId ?? userId;

    const gifts = await getAllGifts(ownerId, limit, offset);

    return response({ gifts }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Get list', error as Error);
  }
}

