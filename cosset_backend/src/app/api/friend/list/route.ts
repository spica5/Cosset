import type { NextRequest } from 'next/server';

import { getUserFriends } from 'src/models/user-friends';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const userId = (searchParams.get('userId') || '').trim();
    const statusRaw = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const status =
      statusRaw === 'pending' ||
      statusRaw === 'accepted' ||
      statusRaw === 'rejected' ||
      statusRaw === 'cancelled' ||
      statusRaw === 'blocked'
        ? statusRaw
        : undefined;

    const friends = await getUserFriends(userId || undefined, status, limit, offset);

    return response({ friends }, STATUS.OK);
  } catch (error) {
    return handleError('Friend - Get list', error as Error);
  }
}
