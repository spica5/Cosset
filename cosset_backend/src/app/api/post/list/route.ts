import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllBlogs } from 'src/models/blogs';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** **************************************
 * Get list of posts
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const limit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const blogs = await getAllBlogs(
      customerId,
      Number.isNaN(limit) ? 50 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    // Keep both keys for compatibility with existing consumers.
    return response({ blogs, posts: blogs }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Get list', error as Error);
  }
}
