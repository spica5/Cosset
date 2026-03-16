import type { NextRequest } from 'next/server';
import type { PostReactionTargetType, PostReactionType } from 'src/models/post-reactions';

import { createHash } from 'node:crypto';

import { JWT_SECRET } from 'src/config-global';
import {
  getPostReactionSummary,
  POST_REACTION_TARGET_TYPES,
  POST_REACTION_TYPES,
  removePostReaction,
  setPostReaction,
} from 'src/models/post-reactions';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const targetTypeSet = new Set<PostReactionTargetType>(POST_REACTION_TARGET_TYPES);
const reactionTypeSet = new Set<PostReactionType>(POST_REACTION_TYPES);

const parseStrictInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim();

    if (!/^-?\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

const normalizeCustomerId = (value: unknown): number | null => {
  const numeric = parseStrictInteger(value);
  if (numeric !== null) {
    return numeric;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  // Derive a stable positive integer for non-numeric identifiers (e.g. UUID auth IDs).
  const digest = createHash('sha256').update(normalized).digest('hex');
  const hashed = Number.parseInt(digest.slice(0, 13), 16);

  if (!Number.isSafeInteger(hashed)) {
    return null;
  }

  return hashed;
};

const normalizeTargetType = (value: unknown): PostReactionTargetType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'collection-item' ||
    normalized === 'collection_item' ||
    normalized === 'collectionitems' ||
    normalized === 'collectionitem'
  ) {
    return 'drawer';
  }

  return targetTypeSet.has(normalized as PostReactionTargetType)
    ? (normalized as PostReactionTargetType)
    : null;
};

const normalizeReactionType = (value: unknown): PostReactionType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return reactionTypeSet.has(normalized as PostReactionType)
    ? (normalized as PostReactionType)
    : null;
};

const readJsonBody = async (req: NextRequest): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getCustomerIdFromToken = async (req: NextRequest): Promise<number | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return normalizeCustomerId(data?.userId);
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const targetType = normalizeTargetType(searchParams.get('targetType'));
    if (!targetType) {
      return response(
        {
          message:
            'targetType is required and must be one of blog, album, collection, drawer (or collection-item)',
        },
        STATUS.BAD_REQUEST,
      );
    }

    const targetId = parseStrictInteger(searchParams.get('targetId'));
    if (targetId === null) {
      return response({ message: 'targetId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    const customerIdParam = searchParams.get('customerId');
    let customerId: number | null = null;

    if (customerIdParam !== null && customerIdParam !== '') {
      customerId = normalizeCustomerId(customerIdParam);
      if (customerId === null) {
        return response({ message: 'customerId must be numeric or non-empty string' }, STATUS.BAD_REQUEST);
      }
    } else {
      customerId = await getCustomerIdFromToken(req);
    }

    const summary = await getPostReactionSummary(targetType, targetId, customerId ?? undefined);

    return response({ summary }, STATUS.OK);
  } catch (error) {
    return handleError('Reaction - Get summary', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);

    if (!body) {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    const targetType = normalizeTargetType(body.targetType);
    if (!targetType) {
      return response(
        {
          message:
            'targetType is required and must be one of blog, album, collection, drawer (or collection-item)',
        },
        STATUS.BAD_REQUEST,
      );
    }

    const targetId = parseStrictInteger(body.targetId);
    if (targetId === null) {
      return response({ message: 'targetId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    const reactionType = normalizeReactionType(body.reactionType);
    if (!reactionType) {
      return response(
        {
          message: 'reactionType is required and must be one of like, love, haha, wow, sad, angry',
        },
        STATUS.BAD_REQUEST,
      );
    }

    let customerId: number | null = null;

    if (body.customerId !== undefined && body.customerId !== null && body.customerId !== '') {
      customerId = normalizeCustomerId(body.customerId);
      if (customerId === null) {
        return response({ message: 'customerId must be numeric or non-empty string' }, STATUS.BAD_REQUEST);
      }
    } else {
      customerId = await getCustomerIdFromToken(req);
    }

    if (customerId === null) {
      return response({ message: 'customerId is required for reacting' }, STATUS.BAD_REQUEST);
    }

    const reaction = await setPostReaction({
      targetType,
      targetId,
      customerId,
      reactionType,
    });

    const summary = await getPostReactionSummary(targetType, targetId, customerId);

    return response({ reaction, summary }, STATUS.OK);
  } catch (error) {
    return handleError('Reaction - Set', error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await readJsonBody(req);

    if (!body) {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    const targetType = normalizeTargetType(body.targetType);
    if (!targetType) {
      return response(
        {
          message:
            'targetType is required and must be one of blog, album, collection, drawer (or collection-item)',
        },
        STATUS.BAD_REQUEST,
      );
    }

    const targetId = parseStrictInteger(body.targetId);
    if (targetId === null) {
      return response({ message: 'targetId is required and must be an integer' }, STATUS.BAD_REQUEST);
    }

    let customerId: number | null = null;

    if (body.customerId !== undefined && body.customerId !== null && body.customerId !== '') {
      customerId = normalizeCustomerId(body.customerId);
      if (customerId === null) {
        return response({ message: 'customerId must be numeric or non-empty string' }, STATUS.BAD_REQUEST);
      }
    } else {
      customerId = await getCustomerIdFromToken(req);
    }

    if (customerId === null) {
      return response({ message: 'customerId is required for removing a reaction' }, STATUS.BAD_REQUEST);
    }

    const removed = await removePostReaction({
      targetType,
      targetId,
      customerId,
    });

    const summary = await getPostReactionSummary(targetType, targetId, customerId);

    return response({ removed, summary }, STATUS.OK);
  } catch (error) {
    return handleError('Reaction - Delete', error as Error);
  }
}
