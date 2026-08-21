import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
import { STATUS, response, handleError } from 'src/utils/response';
import { getUsersBriefByIds } from 'src/models/users';
import {
  getCallPeerId,
  getChatCallById,
  type ChatCallRow,
  type ChatCallStatus,
  updateChatCallStatus,
  userIsCallParticipant,
} from 'src/models/chat-calls';
import {
  getPusherServer,
  userCallChannel,
  USER_CALL_ACCEPTED_EVENT,
  USER_CALL_ENDED_EVENT,
  USER_CALL_REJECTED_EVENT,
  USER_CALL_SIGNAL_EVENT,
} from 'src/utils/pusher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ callId: string }> };

const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId.trim().toLowerCase() : null;
  } catch {
    return null;
  }
};

const displayNameFromBrief = (user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null) => {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
};

const toCallPayload = async (call: ChatCallRow, viewerId: string) => {
  const peerId = getCallPeerId(call, viewerId);
  const users = await getUsersBriefByIds([call.callerId, call.calleeId]);
  const caller = users.get(call.callerId);
  const callee = users.get(call.calleeId);
  const peer = users.get(peerId);

  return {
    id: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    calleeId: call.calleeId,
    mediaType: call.mediaType,
    status: call.status,
    createdAt: call.createdAt,
    answeredAt: call.answeredAt ?? null,
    endedAt: call.endedAt ?? null,
    peer: peer
      ? {
          id: peer.id,
          name: displayNameFromBrief(peer),
          avatarUrl: peer.photoURL || '',
        }
      : {
          id: peerId,
          name: 'Member',
          avatarUrl: '',
        },
    callerName: displayNameFromBrief(caller),
    callerAvatarUrl: caller?.photoURL || '',
    calleeName: displayNameFromBrief(callee),
    calleeAvatarUrl: callee?.photoURL || '',
  };
};

const pushToPeer = async (
  call: ChatCallRow,
  actorId: string,
  event: string,
  payload: Record<string, unknown>,
) => {
  const pusher = getPusherServer();
  if (!pusher) return;

  const peerId = getCallPeerId(call, actorId);
  try {
    await pusher.trigger(userCallChannel(peerId), event, payload);
  } catch (error) {
    console.error(`[Chat Call] Failed to push ${event}`, error);
  }
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to manage calls' }, STATUS.UNAUTHORIZED);
    }

    const { callId: rawCallId } = await params;
    const callId = String(rawCallId || '')
      .trim()
      .toLowerCase();
    if (!callId) {
      return response({ message: 'callId is required' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '')
      .trim()
      .toLowerCase();

    const call = await getChatCallById(callId);
    if (!call || !userIsCallParticipant(call, userId)) {
      return response({ message: 'Call not found' }, STATUS.NOT_FOUND);
    }

    if (action === 'signal') {
      if (!['ringing', 'active'].includes(call.status)) {
        return response({ message: 'Call is not active' }, STATUS.BAD_REQUEST);
      }

      const signalType = String(body?.type || '')
        .trim()
        .toLowerCase();
      if (!['offer', 'answer', 'ice'].includes(signalType)) {
        return response({ message: 'Invalid signal type' }, STATUS.BAD_REQUEST);
      }

      const signalPayload = {
        callId: call.id,
        conversationId: call.conversationId,
        fromUserId: userId,
        type: signalType,
        sdp: body?.sdp ?? null,
        candidate: body?.candidate ?? null,
      };

      await pushToPeer(call, userId, USER_CALL_SIGNAL_EVENT, signalPayload);
      return response({ success: true }, STATUS.OK);
    }

    if (action === 'accept') {
      if (call.calleeId !== userId) {
        return response({ message: 'Only the callee can accept' }, STATUS.BAD_REQUEST);
      }
      if (call.status !== 'ringing') {
        return response({ message: 'Call is not ringing' }, STATUS.BAD_REQUEST);
      }

      const updated = await updateChatCallStatus(call.id, 'active');
      if (!updated) {
        return response({ message: 'Failed to accept call' }, STATUS.BAD_REQUEST);
      }

      const forActor = await toCallPayload(updated, userId);
      const forPeer = await toCallPayload(updated, getCallPeerId(updated, userId));
      await pushToPeer(updated, userId, USER_CALL_ACCEPTED_EVENT, forPeer);
      return response({ call: forActor }, STATUS.OK);
    }

    if (action === 'reject') {
      if (call.calleeId !== userId) {
        return response({ message: 'Only the callee can reject' }, STATUS.BAD_REQUEST);
      }
      if (call.status !== 'ringing') {
        return response({ message: 'Call is not ringing' }, STATUS.BAD_REQUEST);
      }

      const updated = await updateChatCallStatus(call.id, 'rejected', {
        endedReason: 'rejected',
      });
      if (!updated) {
        return response({ message: 'Failed to reject call' }, STATUS.BAD_REQUEST);
      }

      const forActor = await toCallPayload(updated, userId);
      const forPeer = await toCallPayload(updated, getCallPeerId(updated, userId));
      await pushToPeer(updated, userId, USER_CALL_REJECTED_EVENT, forPeer);
      return response({ call: forActor }, STATUS.OK);
    }

    if (action === 'end' || action === 'cancel' || action === 'miss') {
      if (!['ringing', 'active'].includes(call.status)) {
        const payload = await toCallPayload(call, userId);
        return response({ call: payload }, STATUS.OK);
      }

      let nextStatus: ChatCallStatus = 'ended';
      if (call.status === 'ringing') {
        if (action === 'miss' || (action === 'end' && call.callerId !== userId)) {
          nextStatus = 'missed';
        } else if (call.callerId === userId) {
          nextStatus = 'cancelled';
        } else {
          nextStatus = 'rejected';
        }
      }

      const updated = await updateChatCallStatus(call.id, nextStatus, {
        endedReason: action,
      });
      if (!updated) {
        return response({ message: 'Failed to end call' }, STATUS.BAD_REQUEST);
      }

      const forActor = await toCallPayload(updated, userId);
      const forPeer = await toCallPayload(updated, getCallPeerId(updated, userId));
      await pushToPeer(updated, userId, USER_CALL_ENDED_EVENT, forPeer);
      return response({ call: forActor }, STATUS.OK);
    }

    return response({ message: 'Unknown action' }, STATUS.BAD_REQUEST);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
    }
    return handleError('Chat Call - Action', error as Error);
  }
}
