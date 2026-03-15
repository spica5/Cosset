import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCommunityPost } from 'src/models/community-posts';
import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** **************************************
 * POST /api/post/new
 * Body: { post: { customerId?, title, category?, description?, content?,
 *                 file?, isPublic?, totalViews?, following?, comments? } }
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const post = body?.post;

    if (!post || typeof post !== 'object') {
      return response({ message: 'Post payload is required' }, STATUS.BAD_REQUEST);
    }

    // Infer customerId from JWT when not provided by client.
    let inferredCustomerId: string | null = null;
    const authorization = req.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) {
      const accessToken = authorization.split(' ')[1];
      try {
        const data = await verify(accessToken, JWT_SECRET);
        if (data?.userId) inferredCustomerId = data.userId;
      } catch {
        // Ignore token errors; fall back to provided customerId.
      }
    }

    const normalizedComments =
      typeof post.comments === 'string'
        ? post.comments
        : post.comments != null
          ? JSON.stringify(post.comments)
          : null;

    const created = await createCommunityPost({
      customerId: post.customerId || inferredCustomerId || null,
      title: typeof post.title === 'string' ? post.title.trim() : null,
      category: post.category ?? null,
      description:
        typeof post.description === 'string'
          ? post.description
          : post.description != null
            ? String(post.description)
            : null,
      content:
        typeof post.content === 'string'
          ? post.content
          : post.content != null
            ? String(post.content)
            : null,
      files: typeof post.files === 'string' ? post.files : post.files != null ? String(post.files) : null,
      isPublic: post.isPublic ?? post.public ?? 0,
      totalViews: post.totalViews ?? 0,
      following: post.following ?? 0,
      comments: normalizedComments,
    });

    return response({ post: created }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Create', error as Error);
  }
}
