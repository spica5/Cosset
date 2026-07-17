import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';
import { normalizeCinemaCategory } from 'src/models/cinema-films';
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
    const [rows, participants] = await Promise.all([
      listCinemaChatLogs(room),
      listCinemaParticipants(room, true),
    ]);

    const senderIds = rows
      .map((r) => r.senderId)
      .filter((fId): fId is string => typeof fId === 'string' && Boolean(fId.trim()));
    const photoByUserId = await getUserPhotoURLsByIds(senderIds);

    const messages = rows.map((r) => {
      const userId = r.senderId?.trim() || null;
      const authorAvatar =
        userId && photoByUserId.has(userId.toLowerCase())
          ? photoByUserId.get(userId.toLowerCase())!
          : null;

      return {
        id: r.id,
        ownerCustomerId: r.ownerCustomerId,
        category: r.category,
        text: r.message ?? '',
        authorName: r.senderName?.trim() || 'Unknown',
        authorAvatar,
        userId,
        chatMode: 'public' as const,
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

    const inserted = await createCinemaChatLog({
      room,
      senderId: userId,
      senderName: authorName,
      messageType: 'text',
      message: rawMessage,
      chatMode: 'public',
    });

    const payload = {
      id: inserted.id,
      ownerCustomerId: room.ownerCustomerId,
      category: room.category,
      text: rawMessage,
      authorName,
      authorAvatar,
      userId,
      chatMode: 'public' as const,
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
