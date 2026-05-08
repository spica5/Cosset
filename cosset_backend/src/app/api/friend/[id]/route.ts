import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  getUserFriendById,
  updateFriendStatus,
  deleteFriendRequest,
} from 'src/models/user-friends';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const friendId = Number(id);

    if (!Number.isFinite(friendId)) {
      return response({ message: 'Invalid friend request id' }, STATUS.BAD_REQUEST);
    }

    const friend = await getUserFriendById(friendId);

    if (!friend) {
      return response({ message: 'Friend request not found' }, STATUS.NOT_FOUND);
    }

    return response({ friend }, STATUS.OK);
  } catch (error) {
    return handleError('Friend - Get by id', error as Error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const friendId = Number(id);
    const body = await req.json();

    const actorUserId = String(body?.actorUserId || '').trim();
    const status = body?.status;

    if (!Number.isFinite(friendId)) {
      return response({ message: 'Invalid friend request id' }, STATUS.BAD_REQUEST);
    }

    if (!UUID_REGEX.test(actorUserId)) {
      return response({ message: 'actorUserId is required and must be a valid UUID' }, STATUS.BAD_REQUEST);
    }

    if (
      status !== 'accepted' &&
      status !== 'rejected' &&
      status !== 'cancelled' &&
      status !== 'blocked'
    ) {
      return response(
        { message: "status must be 'accepted', 'rejected', 'cancelled', or 'blocked'" },
        STATUS.BAD_REQUEST
      );
    }

    const friend = await updateFriendStatus(friendId, actorUserId, status);

    if (!friend) {
      return response({ message: 'Friend request not found or status transition is not allowed' }, STATUS.NOT_FOUND);
    }

    return response({ friend }, STATUS.OK);
  } catch (error) {
    return handleError('Friend - Respond request', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const friendId = Number(id);
    const { searchParams } = req.nextUrl;
    const userId = (searchParams.get('userId') || '').trim();

    if (!Number.isFinite(friendId)) {
      return response({ message: 'Invalid friend request id' }, STATUS.BAD_REQUEST);
    }

    if (!UUID_REGEX.test(userId)) {
      return response({ message: 'userId is required and must be a valid UUID' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteFriendRequest(friendId, userId);

    if (!deleted) {
      return response({ message: 'Friend request not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Friend request deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Friend - Delete request', error as Error);
  }
}
