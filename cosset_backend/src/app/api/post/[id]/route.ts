import type { NextRequest } from 'next/server';
import type { CommunityPost } from 'src/models/community-posts';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCommunityPostById,
  updateCommunityPost,
  deleteCommunityPost,
} from 'src/models/community-posts';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** **************************************
 * GET /api/post/[id]
 *************************************** */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);

    if (Number.isNaN(postId)) {
      return response({ message: 'Post id must be a number' }, STATUS.BAD_REQUEST);
    }

    const post = await getCommunityPostById(postId);

    if (!post) {
      return response({ message: 'Post not found' }, STATUS.NOT_FOUND);
    }

    return response({ post }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Get by ID', error as Error);
  }
}

/** **************************************
 * PUT /api/post/[id]
 * Body: { post: { title?, category?, description?, content?,
 *                 files?, isPublic?, totalViews?, following?, comments? } }
 *************************************** */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);

    if (Number.isNaN(postId)) {
      return response({ message: 'Post id must be a number' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const data = body?.post;

    if (!data || typeof data !== 'object') {
      return response({ message: 'Post data is required' }, STATUS.BAD_REQUEST);
    }

    const updates: Partial<Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt'>> = {};

    if ('title' in data) updates.title = data.title ?? null;
    if ('category' in data) updates.category = data.category ?? null;
    if ('description' in data) updates.description = data.description ?? null;
    if ('content' in data) updates.content = data.content ?? null;
    if ('files' in data) updates.files = data.files ?? null;
    if ('isPublic' in data) updates.isPublic = data.isPublic ?? data.public ?? null;
    if ('totalViews' in data) updates.totalViews = data.totalViews ?? null;
    if ('following' in data) updates.following = data.following ?? null;
    if ('comments' in data) {
      updates.comments =
        typeof data.comments === 'string'
          ? data.comments
          : data.comments != null
            ? JSON.stringify(data.comments)
            : null;
    }

    const updated = await updateCommunityPost(postId, updates);

    return response({ post: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Update', error as Error);
  }
}

/** **************************************
 * DELETE /api/post/[id]
 *************************************** */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);

    if (Number.isNaN(postId)) {
      return response({ message: 'Post id must be a number' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCommunityPost(postId);

    if (!deleted) {
      return response({ message: 'Post not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Post deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Post - Delete', error as Error);
  }
}
