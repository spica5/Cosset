import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getGiftCount } from 'src/models/gifts';

// Disable Next.js route caching for this API.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

/**
 * Return count of gifts matching optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId') || undefined;
    const openness = searchParams.get('openness') || undefined;
    const category = searchParams.get('category') || undefined;

    const count = await getGiftCount(userId, openness, category);

    return response({ count }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Count', error as Error);
  }
}
