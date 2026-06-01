import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getCoffeeShopById } from 'src/models/coffee-shops';
import {
  createCoffeeShopChatLog,
  listCoffeeShopChatLogsToday,
} from 'src/models/coffee-shop-chat-logs';
import { getUserById, getUserPhotoURLsByIds } from 'src/models/users';
import { getUserFriends } from 'src/models/user-friends';
import { listCoffeeShopParticipants } from 'src/utils/coffee-shop-participants';
import { COFFEE_SHOP_CHAT_EVENT, coffeeShopChatChannel, getPusherServer } from 'src/utils/pusher';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';
import { uuidv4 } from 'src/utils/uuidv4';

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

/**
 * Determine if a viewer can see a message based on chat modes and friend relationships.
 * Rules:
 * - Public messages: everyone can see
 * - Friend mode: visible to friends and the sender
 * - Private mode: only visible to the sender
 */
const canViewMessage = async (
  messageAuthorId: string | null,
  messageMode: 'public' | 'friend' | 'private',
  viewerId: string | null,
): Promise<boolean> => {
  // System messages are always visible
  if (!messageAuthorId) {
    return true;
  }

  // Author can always see their own message
  if (viewerId === messageAuthorId) {
    return true;
  }

  // Public messages visible to all
  if (messageMode === 'public') {
    return true;
  }

  // Private messages only visible to author (already handled above)
  if (messageMode === 'private') {
    return false;
  }

  // Friend mode: check if they are friends
  if (messageMode === 'friend') {
    if (!viewerId) {
      return false;
    }

    try {
      const friends = await getUserFriends(viewerId, 'accepted', 1000, 0);
      return friends.some(
        (f) => (f.userId1 === messageAuthorId || f.userId2 === messageAuthorId)
      );
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
      listCoffeeShopChatLogsToday(coffeeShopId),
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
          const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';
          const canView = await canViewMessage(userId, messageMode, viewerId);
          return canView ? r : null;
        })
      )
    ).filter((r): r is typeof rows[0] => r !== null);

    const messages = filteredRows.map((r) => {
      const userId = r.senderId?.trim() || null;
      const authorAvatar =
        userId && photoByUserId.has(userId.toLowerCase())
          ? photoByUserId.get(userId.toLowerCase())!
          : null;
      const messageMode = (r.chatMode as 'public' | 'friend' | 'private') || 'public';

      return {
        id: r.id,
        coffeeShopId: r.coffeeShopId,
        text: r.message ?? '',
        authorName: r.senderName?.trim() || 'Unknown',
        authorAvatar,
        userId,
        chatMode: messageMode,
        sentAt:
          typeof r.createdAt === 'string'
            ? new Date(r.createdAt).toISOString()
            : r.createdAt instanceof Date
              ? r.createdAt.toISOString()
              : new Date(String(r.createdAt)).toISOString(),
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
    const chatMode = (typeof body?.chatMode === 'string' && ['public', 'friend', 'private'].includes(body.chatMode))
      ? body.chatMode
      : 'public';

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

    await createCoffeeShopChatLog({
      coffeeShopId,
      senderId: userId,
      senderName: authorName,
      senderType: userId ? 'member' : 'guest',
      messageType: 'text',
      message: rawMessage,
      chatMode: chatMode as 'public' | 'friend' | 'private',
      fileUrl: null,
      fileName: null,
      mimeType: null,
    });

    const payload = {
      id: uuidv4(),
      coffeeShopId,
      text: rawMessage,
      authorName,
      authorAvatar,
      userId,
      chatMode,
      sentAt: new Date().toISOString(),
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
