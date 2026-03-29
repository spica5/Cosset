import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import {
  deletePostCommentById,
  updatePostCommentVisibility,
  createPostComment,
  getPostCommentById,
  getLatestPostCommentCustomerId,
  getPostComments,
} from 'src/models/post-comments';
import { getBlogById } from 'src/models/blogs';
import { getAlbumById } from 'src/models/albums';
import { getCommunityPostById } from 'src/models/community-posts';
import { getGiftById } from 'src/models/gifts';
import { getCollectionItemById } from 'src/models/collection-items';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TARGET_TYPES = ['blog', 'album', 'collection', 'collection-item', 'drawer', 'community'] as const;

type TargetType = (typeof TARGET_TYPES)[number];

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeTargetType = (value: unknown): TargetType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return (TARGET_TYPES as readonly string[]).includes(normalized)
    ? (normalized as TargetType)
    : null;
};

const getCustomerIdFromToken = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
};

const isRequesterTargetOwner = async (
  requesterCustomerId: string,
  targetType: TargetType,
  targetId: number,
): Promise<boolean> => {
  if (!requesterCustomerId) {
    return false;
  }

  if (targetType === 'blog') {
    const blog = await getBlogById(targetId);
    return !!blog?.customerId && String(blog.customerId) === requesterCustomerId;
  }

  if (targetType === 'album') {
    const album = await getAlbumById(targetId);
    return !!album?.userId && String(album.userId) === requesterCustomerId;
  }

  if (targetType === 'community') {
    const post = await getCommunityPostById(targetId);
    return !!post?.customerId && String(post.customerId) === requesterCustomerId;
  }

  if (targetType === 'drawer') {
    const gift = await getGiftById(targetId);
    return !!gift?.userId && String(gift.userId) === requesterCustomerId;
  }

  if (targetType === 'collection' || targetType === 'collection-item') {
    const item = await getCollectionItemById(targetId);
    return !!item?.customerId && String(item.customerId) === requesterCustomerId;
  }

  return false;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const targetId = parseInteger(searchParams.get('targetId'));

    if (targetId === null) {
      return response({ message: 'targetId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    const targetType = normalizeTargetType(searchParams.get('targetType') || 'community');

    if (!targetType) {
      return response(
        { message: 'targetType must be one of blog, album, collection, collection-item, drawer, community' },
        STATUS.BAD_REQUEST,
      );
    }

    const limit = parseInteger(searchParams.get('limit')) ?? 100;
    const offset = parseInteger(searchParams.get('offset')) ?? 0;

    const comments = await getPostComments(targetId, targetType, limit, offset);

    return response({ comments }, STATUS.OK);
  } catch (error) {
    return handleError('Post Comment - List', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    const targetId = parseInteger(body.targetId);

    if (targetId === null) {
      return response({ message: 'targetId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const targetType = normalizeTargetType(body.targetType ?? 'community');

    if (!targetType) {
      return response(
        { message: 'targetType must be one of blog, album, collection, collection-item, drawer, community' },
        STATUS.BAD_REQUEST,
      );
    }


    if (!comment) {
      return response({ message: 'comment is required' }, STATUS.BAD_REQUEST);
    }

    let customerId: string | null = null;

    if (typeof body.customerId === 'string' && body.customerId.trim()) {
      customerId = body.customerId.trim();
    } else {
      customerId = await getCustomerIdFromToken(req);
    }

    const inputPrevCustomer =
      typeof body.prevCustomer === 'string' && body.prevCustomer.trim() ? body.prevCustomer.trim() : null;

    let prevCustomer: string | null = inputPrevCustomer;

    if (!prevCustomer) {
      const latestCommentCustomerId = await getLatestPostCommentCustomerId(targetId, targetType);

      // Rule:
      // 1) First comment: prev_customer = customer_id.
      // 2) Next comments: prev_customer = previous comment's customer_id.
      prevCustomer = latestCommentCustomerId ?? customerId ?? null;
    }

    const created = await createPostComment({
      targetId,
      customerId,
      prevCustomer,
      targetType,
      comment,
    });

    return response({ comment: created }, STATUS.OK);
  } catch (error) {
    return handleError('Post Comment - Create', error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const commentId = parseInteger(searchParams.get('commentId'));

    if (commentId === null) {
      return response({ message: 'commentId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    const requesterCustomerId = await getCustomerIdFromToken(req);

    if (!requesterCustomerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const existingComment = await getPostCommentById(commentId);

    if (!existingComment) {
      return response({ message: 'Comment not found' }, STATUS.NOT_FOUND);
    }

    if (!existingComment.customerId || String(existingComment.customerId) !== requesterCustomerId) {
      return response({ message: 'You can only delete your own comment' }, STATUS.UNAUTHORIZED);
    }

    const deleted = await deletePostCommentById(commentId);

    if (!deleted) {
      return response({ message: 'Comment not found' }, STATUS.NOT_FOUND);
    }

    return response({ success: true }, STATUS.OK);
  } catch (error) {
    return handleError('Post Comment - Delete', error as Error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    const commentId = parseInteger(body.commentId);

    if (commentId === null) {
      return response({ message: 'commentId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    if (typeof body.visible !== 'boolean') {
      return response({ message: 'visible is required and must be a boolean' }, STATUS.BAD_REQUEST);
    }

    const requesterCustomerId = await getCustomerIdFromToken(req);

    if (!requesterCustomerId) {
      return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
    }

    const existingComment = await getPostCommentById(commentId);

    if (!existingComment) {
      return response({ message: 'Comment not found' }, STATUS.NOT_FOUND);
    }

    const isCommentOwner =
      !!existingComment.customerId && String(existingComment.customerId) === requesterCustomerId;
    const commentTargetType = normalizeTargetType(existingComment.targetType);
    const commentTargetId = parseInteger(existingComment.targetId);

    const isTargetOwner =
      !!commentTargetType &&
      commentTargetId !== null &&
      (await isRequesterTargetOwner(requesterCustomerId, commentTargetType, commentTargetId));

    if (!isCommentOwner && !isTargetOwner) {
      return response(
        { message: 'You can only modify visibility for your own or your post comments' },
        STATUS.UNAUTHORIZED,
      );
    }

    const updated = await updatePostCommentVisibility(commentId, body.visible);

    if (!updated) {
      return response({ message: 'Comment not found' }, STATUS.NOT_FOUND);
    }

    return response({ comment: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Post Comment - Update Visibility', error as Error);
  }
}
