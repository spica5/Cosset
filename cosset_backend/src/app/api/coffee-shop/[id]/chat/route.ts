import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';

import { getCoffeeShopById } from 'src/models/coffee-shops';
import {
  createCoffeeShopChatLog,
  listCoffeeShopChatLogs,
} from 'src/models/coffee-shop-chat-logs';

import { getUserFriends } from 'src/models/user-friends';
import { getUserById, getUserPhotoURLsByIds } from 'src/models/users';

import { touchCoffeeShopPresence } from 'src/models/coffee-shop-presence';
import { listCoffeeShopParticipants } from 'src/utils/coffee-shop-participants';
import { COFFEE_SHOP_CHAT_EVENT, coffeeShopChatChannel, getPusherServer } from 'src/utils/pusher';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

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

/** DB timestamps are UTC but often returned without a timezone suffix. */
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

/**
 * Determine if a viewer can see a message based on chat modes and friend relationships.
 * Rules:
 * - Public messages: everyone can see
 * - Friend mode: visible to friends and the sender
 * - Private mode: only visible to the sender and receiver
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

  // System messages are always visible
  if (!authorKey) {
    return true;
  }

  // Author can always see their own message
  if (viewerKey === authorKey) {
    return true;
  }

  // Public messages visible to all
  if (messageMode === 'public') {
    return true;
  }

  // Private messages are visible to the chosen receiver. Legacy private rows with
  // no receiver remain visible only to the author, handled above.
  if (messageMode === 'private') {
    return Boolean(viewerKey && receiverKey && viewerKey === receiverKey);
  }

  // Friend mode: check if they are friends
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const coffeeShop = await getCoffeeShopById(coffeeShopId);

    if (!coffeeShop) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    const viewerId = await getUserIdFromRequest(_req);
    const [rows, participants] = await Promise.all([
      listCoffeeShopChatLogs(coffeeShopId),
      listCoffeeShopParticipants(coffeeShopId, true),
    ]);

    const senderIds = rows
      .map((r) => r.senderId)
      .filter((fId): fId is string => typeof fId === 'string' && Boolean(fId.trim()));
    const photoByUserId = await getUserPhotoURLsByIds(senderIds);

    // Filter messages based on visibility rules
    const filteredRows = (
      await Promise.all(
        rows.map(async (r) => {
          const userId = r.senderId?.trim() || null;
          const receiverId = r.receiverId?.trim() || null;
          const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';
          const canView = await canViewMessage(userId, receiverId, messageMode, viewerId);
          return canView ? r : null;
        })
      )
    ).filter((r): r is typeof rows[0] => r !== null);

    const messages = filteredRows.map((r) => {
      const userId = r.senderId?.trim() || null;
      const receiverId = r.receiverId?.trim() || null;
      const authorAvatar =
        userId && photoByUserId.has(userId.toLowerCase())
          ? photoByUserId.get(userId.toLowerCase())!
          : null;
      const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';

      const messageType = (r.messageType as 'text' | 'file') || 'text';

      return {
        id: r.id,
        coffeeShopId: r.coffeeShopId,
        text: r.message ?? '',
        authorName: r.senderName?.trim() || 'Unknown',
        authorAvatar,
        userId,
        receiverId,
        chatMode: messageMode,
        messageType,
        fileUrl: r.fileUrl ?? null,
        fileName: r.fileName ?? null,
        mimeType: r.mimeType ?? null,
        sentAt: toUtcIsoTimestamp(r.createdAt),
      };
    });

    return response({ messages, participants }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Chat - Get', error as Error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const coffeeShop = await getCoffeeShopById(coffeeShopId);

    if (!coffeeShop) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    const body = await req.json();
    const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl.trim().slice(0, 1000) : '';
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim().slice(0, 255) : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().slice(0, 100) : '';
    const hasFile = Boolean(fileUrl);

    if (!rawMessage && !hasFile) {
      return response({ message: 'Message or file is required' }, STATUS.BAD_REQUEST);
    }

    if (rawMessage.length > MAX_MESSAGE_LEN) {
      return response(
        { message: `Message must be at most ${MAX_MESSAGE_LEN} characters` },
        STATUS.BAD_REQUEST,
      );
    }

    const userId = await getUserIdFromRequest(req);

    if (hasFile && !userId) {
      return response({ message: 'Sign in to send files' }, STATUS.BAD_REQUEST);
    }
    let authorName = trimDisplayName(body?.displayName);
    let authorAvatar: string | null = null;
    const chatMode = (typeof body?.chatMode === 'string' && ['public', 'friend', 'private'].includes(body.chatMode))
      ? body.chatMode
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
    } else if (!authorName) {
      return response({ message: 'Display name is required for guests' }, STATUS.BAD_REQUEST);
    }

    if (chatMode === 'private') {
      if (!userId) {
        return response({ message: 'Sign in to send private messages' }, STATUS.BAD_REQUEST);
      }

      if (!receiverId) {
        return response({ message: 'Private messages require a receiver' }, STATUS.BAD_REQUEST);
      }

      if (receiverId === userId.trim().toLowerCase()) {
        return response({ message: 'Choose another participant for private chat' }, STATUS.BAD_REQUEST);
      }

      const participants = await listCoffeeShopParticipants(coffeeShopId, false);
      const receiverIsPresent = participants.some(
        (p) => p.userId.trim().toLowerCase() === receiverId,
      );

      if (!receiverIsPresent) {
        return response({ message: 'Private receiver is not in this coffee shop' }, STATUS.BAD_REQUEST);
      }

      const friends = await getUserFriends(userId, 'accepted', 1000, 0);
      const receiverIsFriend = friends.some((f) => {
        const userId1 = f.userId1.trim().toLowerCase();
        const userId2 = f.userId2.trim().toLowerCase();
        return userId1 === receiverId || userId2 === receiverId;
      });

      if (!receiverIsFriend) {
        return response({ message: 'Private receiver must be an accepted friend' }, STATUS.BAD_REQUEST);
      }
    }

    const messageType = hasFile ? 'file' : 'text';
    const storedMessage = rawMessage || fileName || 'Attachment';

    if (userId) {
      await touchCoffeeShopPresence(coffeeShopId, userId).catch(() => undefined);
    }

    const inserted = await createCoffeeShopChatLog({
      coffeeShopId,
      senderId: userId,
      senderName: authorName,
      receiverId: chatMode === 'private' ? receiverId : null,
      messageType,
      message: storedMessage,
      chatMode: chatMode as 'public' | 'friend' | 'private',
      fileUrl: hasFile ? fileUrl : null,
      fileName: hasFile ? fileName || null : null,
      mimeType: hasFile ? mimeType || null : null,
    });

    const payload = {
      id: inserted.id,
      coffeeShopId,
      text: storedMessage,
      authorName,
      authorAvatar,
      userId,
      receiverId: chatMode === 'private' ? receiverId : null,
      chatMode,
      messageType,
      fileUrl: hasFile ? fileUrl : null,
      fileName: hasFile ? fileName || null : null,
      mimeType: hasFile ? mimeType || null : null,
      sentAt: toUtcIsoTimestamp(inserted.createdAt),
    };

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(coffeeShopChatChannel(coffeeShopId), COFFEE_SHOP_CHAT_EVENT, payload);
    }

    return response({ chatMessage: payload }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Chat - Post', error as Error);
  }
}
