import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllCommunityPosts } from 'src/models/community-posts';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** **************************************
 * GET /api/post/list
 * Query params: customerId?, authorRole?, limit?, offset?
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const authorRole = searchParams.get('authorRole') ?? undefined;
    const limit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const posts = await getAllCommunityPosts(
      customerId,
      Number.isNaN(limit) ? 50 : limit,
      Number.isNaN(offset) ? 0 : offset,
      authorRole,
    );

    return response({ posts }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Get list', error as Error);
  }
}
