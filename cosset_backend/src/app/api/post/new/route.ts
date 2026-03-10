import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createBlog } from 'src/models/blogs';
import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Create a new blog
 * Body: { blog: { customerId, title, category, description, content, file, isPublic/public, totalViews, following, comments } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blog = body?.blog;

    if (!blog || typeof blog !== 'object') {
      return response({ message: 'Blog payload is required' }, STATUS.BAD_REQUEST);
    }

    // Try to infer customerId from JWT when omitted by client.
    let inferredCustomerId: string | null = null;
    const authorization = req.headers.get('authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      const accessToken = authorization.split(' ')[1];
      try {
        const data = await verify(accessToken, JWT_SECRET);
        if (data?.userId) {
          inferredCustomerId = data.userId;
        }
      } catch {
        // Ignore token parse errors and fall back to provided customerId.
      }
    }

    const normalizedComments =
      typeof blog.comments === 'string'
        ? blog.comments
        : blog.comments != null
          ? JSON.stringify(blog.comments)
          : null;

    const createdBlog = await createBlog({
      customerId: blog.customerId || inferredCustomerId || null,
      title: typeof blog.title === 'string' ? blog.title.trim() : null,
      category: blog.category ?? null,
      description:
        typeof blog.description === 'string'
          ? blog.description
          : blog.description != null
            ? String(blog.description)
            : null,
      content:
        typeof blog.content === 'string'
          ? blog.content
          : blog.content != null
            ? String(blog.content)
            : null,
      file:
        typeof blog.file === 'string' ? blog.file : blog.file != null ? String(blog.file) : null,
      isPublic: blog.isPublic ?? blog.public ?? 0,
      totalViews: blog.totalViews ?? 0,
      following: blog.following ?? 0,
      comments: normalizedComments,
    });

    return response({ blog: createdBlog }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Create', error as Error);
  }
}
