import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { normalizeCinemaCategory } from 'src/models/cinema-films';
import { getUserFriends } from 'src/models/user-friends';
import { getUserById, getUserPhotoURLsByIds } from 'src/models/users';
import { touchCinemaPresence } from 'src/models/cinema-presence';
import { listCinemaChatLogs, createCinemaChatLog } from 'src/models/cinema-chat-logs';

import { STATUS, response, handleError } from 'src/utils/response';
import { listCinemaParticipants } from 'src/utils/cinema-participants';
import { getPusherServer, CINEMA_CHAT_EVENT, cinemaChatChannel } from 'src/utils/pusher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const MAX_MESSAGE_LEN = 2000;
const MAX_DISPLAY_NAME_LEN = 80;

const isLikelyUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
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

const trimDisplayName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_DISPLAY_NAME_LEN);
};

const toUtcIsoTimestamp = (value: Date | string): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) {
    return new Date().toISOString();
  }

  const normalized = raw.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
  const hasTimezone = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized);
  const parsed = new Date(hasTimezone ? normalized : `${normalized}Z`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const parseRoom = async (params: Promise<{ ownerId: string; category: string }>) => {
  const { ownerId, category: categoryRaw } = await params;
  const ownerCustomerId = String(ownerId || '').trim();
  const category = normalizeCinemaCategory(categoryRaw);

  if (!ownerCustomerId) {
    return { error: response({ message: 'Invalid owner id' }, STATUS.BAD_REQUEST) };
  }

  if (!category) {
    return { error: response({ message: 'Invalid cinema category' }, STATUS.BAD_REQUEST) };
  }

  return { room: { ownerCustomerId, category } };
};

/**
 * Visibility rules (same as coffee shop):
 * - Public: everyone
 * - Friend: sender + accepted friends
 * - Private: sender + chosen receiver only
 */
const canViewMessage = async (
  messageAuthorId: string | null,
  receiverId: string | null,
  messageMode: 'public' | 'friend' | 'private',
  viewerId: string | null,
): Promise<boolean> => {
  const authorKey = messageAuthorId?.trim().toLowerCase() || null;
  const receiverKey = receiverId?.trim().toLowerCase() || null;
  const viewerKey = viewerId?.trim().toLowerCase() || null;

  if (!authorKey) {
    return true;
  }

  if (viewerKey === authorKey) {
    return true;
  }

  if (messageMode === 'public') {
    return true;
  }

  if (messageMode === 'private') {
    return Boolean(viewerKey && receiverKey && viewerKey === receiverKey);
  }

  if (messageMode === 'friend') {
    if (!viewerId) {
      return false;
    }

    try {
      const friends = await getUserFriends(viewerId, 'accepted', 1000, 0);
      return friends.some((f) => {
        const userId1 = f.userId1.trim().toLowerCase();
        const userId2 = f.userId2.trim().toLowerCase();
        return userId1 === authorKey || userId2 === authorKey;
      });
    } catch {
      return false;
    }
  }

  return false;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const { room } = parsed;
    const viewerId = await getUserIdFromRequest(_req);
    const [rows, participants] = await Promise.all([
      listCinemaChatLogs(room),
      listCinemaParticipants(room, true),
    ]);

    const senderIds = rows
      .map((r) => r.senderId)
      .filter((fId): fId is string => typeof fId === 'string' && Boolean(fId.trim()));
    const photoByUserId = await getUserPhotoURLsByIds(senderIds);

    const filteredRows = (
      await Promise.all(
        rows.map(async (r) => {
          const userId = r.senderId?.trim() || null;
          const receiverId = r.receiverId?.trim() || null;
          const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';
          const canView = await canViewMessage(userId, receiverId, messageMode, viewerId);
          return canView ? r : null;
        }),
      )
    ).filter((r): r is (typeof rows)[0] => r !== null);

    const messages = filteredRows.map((r) => {
      const userId = r.senderId?.trim() || null;
      const receiverId = r.receiverId?.trim() || null;
      const authorAvatar =
        userId && photoByUserId.has(userId.toLowerCase())
          ? photoByUserId.get(userId.toLowerCase())!
          : null;
      const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';

      return {
        id: r.id,
        ownerCustomerId: r.ownerCustomerId,
        category: r.category,
        text: r.message ?? '',
        authorName: r.senderName?.trim() || 'Unknown',
        authorAvatar,
        userId,
        receiverId,
        chatMode: messageMode,
        messageType: (r.messageType as 'text' | 'file') || 'text',
        fileUrl: r.fileUrl ?? null,
        fileName: r.fileName ?? null,
        mimeType: r.mimeType ?? null,
        sentAt: toUtcIsoTimestamp(r.createdAt),
      };
    });

    return response({ messages, participants }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Chat - Get', error as Error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const { room } = parsed;
    const body = await req.json();
    const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      return response({ message: 'Message is required' }, STATUS.BAD_REQUEST);
    }

    if (rawMessage.length > MAX_MESSAGE_LEN) {
      return response(
        { message: `Message must be at most ${MAX_MESSAGE_LEN} characters` },
        STATUS.BAD_REQUEST,
      );
    }

    const userId = await getUserIdFromRequest(req);
    let authorName = trimDisplayName(body?.displayName);
    let authorAvatar: string | null = null;
    const chatMode =
      typeof body?.chatMode === 'string' && ['public', 'friend', 'private'].includes(body.chatMode)
        ? (body.chatMode as 'public' | 'friend' | 'private')
        : 'public';
    const receiverId =
      typeof body?.receiverId === 'string' && isLikelyUuid(body.receiverId)
        ? body.receiverId.trim().toLowerCase()
        : null;

    if (userId) {
      const user = await getUserById(userId);
      const fromProfile =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.email?.split('@')[0] ||
        'Member';
      authorName = authorName || fromProfile;
      const photo = user?.photoURL != null ? String(user.photoURL).trim() : '';
      authorAvatar = photo || null;
      await touchCinemaPresence(room, userId).catch(() => undefined);
    } else if (!authorName) {
      return response({ message: 'Sign in or provide a display name' }, STATUS.BAD_REQUEST);
    }

    if (chatMode === 'friend' && !userId) {
      return response({ message: 'Sign in to send friend messages' }, STATUS.BAD_REQUEST);
    }

    if (chatMode === 'private') {
      if (!userId) {
        return response({ message: 'Sign in to send private messages' }, STATUS.BAD_REQUEST);
      }

      if (!receiverId) {
        return response({ message: 'Private messages require a receiver' }, STATUS.BAD_REQUEST);
      }

      if (receiverId === userId.trim().toLowerCase()) {
        return response(
          { message: 'Choose another participant for private chat' },
          STATUS.BAD_REQUEST,
        );
      }

      const participants = await listCinemaParticipants(room, false);
      const receiverIsPresent = participants.some(
        (p) => p.userId.trim().toLowerCase() === receiverId,
      );

      if (!receiverIsPresent) {
        return response(
          { message: 'Private receiver is not in this cinema room' },
          STATUS.BAD_REQUEST,
        );
      }

      const friends = await getUserFriends(userId, 'accepted', 1000, 0);
      const receiverIsFriend = friends.some((f) => {
        const userId1 = f.userId1.trim().toLowerCase();
        const userId2 = f.userId2.trim().toLowerCase();
        return userId1 === receiverId || userId2 === receiverId;
      });

      if (!receiverIsFriend) {
        return response(
          { message: 'Private receiver must be an accepted friend' },
          STATUS.BAD_REQUEST,
        );
      }
    }

    const inserted = await createCinemaChatLog({
      room,
      senderId: userId,
      senderName: authorName,
      receiverId: chatMode === 'private' ? receiverId : null,
      messageType: 'text',
      message: rawMessage,
      chatMode,
    });

    const payload = {
      id: inserted.id,
      ownerCustomerId: room.ownerCustomerId,
      category: room.category,
      text: rawMessage,
      authorName,
      authorAvatar,
      userId,
      receiverId: chatMode === 'private' ? receiverId : null,
      chatMode,
      messageType: 'text' as const,
      sentAt: toUtcIsoTimestamp(inserted.createdAt),
    };

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(
        cinemaChatChannel(room.ownerCustomerId, room.category),
        CINEMA_CHAT_EVENT,
        payload,
      );
    }

    return response({ chatMessage: payload }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Chat - Post', error as Error);
  }
}
