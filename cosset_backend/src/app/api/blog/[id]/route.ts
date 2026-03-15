import type { NextRequest } from 'next/server';
import type { Blog } from 'src/models/blogs';

import { STATUS, response, handleError } from 'src/utils/response';

import { getBlogById, updateBlog, deleteBlog } from 'src/models/blogs';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** **************************************
 * GET /api/blog/[id]
 *************************************** */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const blogId = Number.parseInt(id, 10);

    if (Number.isNaN(blogId)) {
      return response({ message: 'Blog id must be a number' }, STATUS.BAD_REQUEST);
    }

    const blog = await getBlogById(blogId);

    if (!blog) {
      return response({ message: 'Blog not found' }, STATUS.NOT_FOUND);
    }

    return response({ blog }, STATUS.OK);
  } catch (error) {
    return handleError('Blog - Get by ID', error as Error);
  }
}

/** **************************************
 * PUT /api/blog/[id]
 * Body: { blog: { title?, category?, description?, content?,
 *                 file?, isPublic?, totalViews?, following?, fontPreset?, backgroundPreset?, comments? } }
 *************************************** */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const blogId = Number.parseInt(id, 10);

    if (Number.isNaN(blogId)) {
      return response({ message: 'Blog id must be a number' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const data = body?.blog;

    if (!data || typeof data !== 'object') {
      return response({ message: 'Blog data is required' }, STATUS.BAD_REQUEST);
    }

    const updates: Partial<Omit<Blog, 'id' | 'createdAt' | 'updatedAt'>> = {};

    if ('customerId' in data) updates.customerId = data.customerId ?? null;
    if ('title' in data) updates.title = data.title ?? null;
    if ('category' in data) updates.category = data.category ?? null;
    if ('description' in data) updates.description = data.description ?? null;
    if ('content' in data) updates.content = data.content ?? null;
    if ('file' in data) updates.file = data.file ?? null;
    if ('isPublic' in data) updates.isPublic = data.isPublic ?? data.public ?? null;
    if ('totalViews' in data) updates.totalViews = data.totalViews ?? null;
    if ('following' in data) updates.following = data.following ?? null;
    if ('fontPreset' in data) {
      updates.fontPreset =
        typeof data.fontPreset === 'string'
          ? data.fontPreset.trim()
          : data.fontPreset != null
            ? String(data.fontPreset)
            : null;
    }
    if ('backgroundPreset' in data) {
      updates.backgroundPreset =
        typeof data.backgroundPreset === 'string'
          ? data.backgroundPreset.trim()
          : data.backgroundPreset != null
            ? String(data.backgroundPreset)
            : null;
    }
    if ('comments' in data) {
      updates.comments =
        typeof data.comments === 'string'
          ? data.comments
          : data.comments != null
            ? JSON.stringify(data.comments)
            : null;
    }

    const updated = await updateBlog(blogId, updates);

    return response({ blog: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Blog - Update', error as Error);
  }
}

/** **************************************
 * DELETE /api/blog/[id]
 *************************************** */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const blogId = Number.parseInt(id, 10);

    if (Number.isNaN(blogId)) {
      return response({ message: 'Blog id must be a number' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteBlog(blogId);

    if (!deleted) {
      return response({ message: 'Blog not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Blog deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Blog - Delete', error as Error);
  }
}
