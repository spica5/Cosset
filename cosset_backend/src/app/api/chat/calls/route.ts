import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
import { STATUS, response, handleError } from 'src/utils/response';
import { getUsersBriefByIds } from 'src/models/users';
import {
  createChatCall,
  getCallPeerId,
  getChatCallById,
  type ChatCallMediaType,
  type ChatCallRow,
} from 'src/models/chat-calls';
import {
  getPusherServer,
  userCallChannel,
  USER_CALL_INVITE_EVENT,
} from 'src/utils/pusher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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
    call: {
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
    },
  };
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to start a call' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const conversationId = String(body?.conversationId || '')
      .trim()
      .toLowerCase();
    const calleeId = String(body?.calleeId || '')
      .trim()
      .toLowerCase();
    const mediaType: ChatCallMediaType =
      String(body?.mediaType || '').toLowerCase() === 'video' ? 'video' : 'audio';

    if (!conversationId || !calleeId) {
      return response({ message: 'conversationId and calleeId are required' }, STATUS.BAD_REQUEST);
    }

    const call = await createChatCall({
      id: crypto.randomUUID(),
      conversationId,
      callerId: userId,
      calleeId,
      mediaType,
    });

    const payload = await toCallPayload(call, userId);
    const calleePayload = await toCallPayload(call, calleeId);

    const pusher = getPusherServer();
    if (pusher) {
      try {
        await pusher.trigger(userCallChannel(calleeId), USER_CALL_INVITE_EVENT, calleePayload.call);
      } catch (error) {
        console.error('[Chat Call] Failed to push invite', error);
      }
    }

    return response(payload, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      const status =
        error.code === 'CHAT_CALL_BUSY'
          ? STATUS.CONFLICT
          : error.code === 'CHAT_CALL_FORBIDDEN' || error.code === 'CHAT_CALL_CONVERSATION_NOT_FOUND'
            ? STATUS.BAD_REQUEST
            : STATUS.BAD_REQUEST;
      return response({ message: error.message, code: error.code }, status);
    }

    return handleError('Chat Call - Invite', error as Error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to view call state' }, STATUS.UNAUTHORIZED);
    }

    const callId = String(req.nextUrl.searchParams.get('callId') || '')
      .trim()
      .toLowerCase();
    if (!callId) {
      return response({ message: 'callId is required' }, STATUS.BAD_REQUEST);
    }

    const call = await getChatCallById(callId);
    if (!call) {
      return response({ message: 'Call not found' }, STATUS.NOT_FOUND);
    }

    if (call.callerId !== userId && call.calleeId !== userId) {
      return response({ message: 'Call not found' }, STATUS.NOT_FOUND);
    }

    return response(await toCallPayload(call, userId), STATUS.OK);
  } catch (error) {
    return handleError('Chat Call - Get', error as Error);
  }
}
