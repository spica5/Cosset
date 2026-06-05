import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getCoffeeShopById } from 'src/models/coffee-shops';
import {
  getCoffeeShopChatLogById,
  softDeleteCoffeeShopChatLog,
} from 'src/models/coffee-shop-chat-logs';
import { getUserById } from 'src/models/users';
import {
  COFFEE_SHOP_CHAT_DELETED_EVENT,
  coffeeShopChatChannel,
  getPusherServer,
} from 'src/utils/pusher';
import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

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
    return typeof data?.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
};

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const { id, messageId: messageIdRaw } = await params;
    const coffeeShopId = Number.parseInt(id, 10);
    const messageId = Number.parseInt(messageIdRaw, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    if (Number.isNaN(messageId)) {
      return response({ message: 'Invalid message id' }, STATUS.BAD_REQUEST);
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to delete messages' }, STATUS.UNAUTHORIZED);
    }

    const coffeeShop = await getCoffeeShopById(coffeeShopId);
    if (!coffeeShop) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    const existing = await getCoffeeShopChatLogById(coffeeShopId, messageId);
    if (!existing || existing.isDeleted) {
      return response({ message: 'Message not found' }, STATUS.NOT_FOUND);
    }

    const viewer = await getUserById(userId);
    const isAdmin = String(viewer?.role || '').trim().toLowerCase() === 'admin';
    const senderId = existing.senderId?.trim().toLowerCase() || '';
    const isSender = senderId === userId.trim().toLowerCase();

    if (!isAdmin && !isSender) {
      return response({ message: 'You can only delete your own messages' }, STATUS.FORBIDDEN);
    }

    const deleted = await softDeleteCoffeeShopChatLog(coffeeShopId, messageId);
    if (!deleted) {
      return response({ message: 'Message not found' }, STATUS.NOT_FOUND);
    }

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(coffeeShopChatChannel(coffeeShopId), COFFEE_SHOP_CHAT_DELETED_EVENT, {
        id: String(messageId),
        coffeeShopId,
      });
    }

    return response({ message: 'Message deleted', id: String(messageId) }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Chat - Delete', error as Error);
  }
}
