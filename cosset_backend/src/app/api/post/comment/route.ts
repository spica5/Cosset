import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import {
  createPostComment,
  getLatestPostCommentCustomerId,
  getPostComments,
} from 'src/models/post-comments';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const TARGET_TYPES = ['blog', 'album', 'collection', 'drawer', 'community'] as const;

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
        { message: 'targetType must be one of blog, album, collection, drawer, community' },
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
        { message: 'targetType must be one of blog, album, collection, drawer, community' },
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
