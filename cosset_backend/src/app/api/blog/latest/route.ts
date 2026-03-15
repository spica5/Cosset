import type { NextRequest } from 'next/server';

import { paramCase } from 'src/utils/change-case';
import { STATUS, response, handleError } from 'src/utils/response';

import { _blogs } from 'src/_mock/_blog';

// ----------------------------------------------------------------------

export const runtime = 'edge';

/** **************************************
 * Get latest Blogs
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const title = searchParams.get('title');

    const blogs = _blogs();

    const latestBlogs = blogs.filter((blogItem) => paramCase(blogItem.title) !== title);

    return response({ latestBlogs }, STATUS.OK);
  } catch (error) {
    return handleError('Blog - Get latest', error);
  }
}
