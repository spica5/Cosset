import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getBlogById } from 'src/models/blogs';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** **************************************
 * Get blog details
 *************************************** */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const idParam = searchParams.get('id');

    if (!idParam) {
      return response({ message: 'Blog id is required' }, STATUS.BAD_REQUEST);
    }

    const id = Number.parseInt(idParam, 10);

    if (Number.isNaN(id)) {
      return response({ message: 'Blog id must be a number' }, STATUS.BAD_REQUEST);
    }

    const blog = await getBlogById(id);

    if (!blog) {
      return response({ message: 'Blog not found!' }, STATUS.NOT_FOUND);
    }

    // Keep both keys for compatibility with existing consumers.
    return response({ blog }, STATUS.OK);
  } catch (error) {
    return handleError('Blog - Get details', error as Error);
  }
}
