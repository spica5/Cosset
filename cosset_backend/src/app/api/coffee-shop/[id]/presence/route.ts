import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getCoffeeShopById } from 'src/models/coffee-shops';
import {
  removeCoffeeShopPresence,
  upsertCoffeeShopPresence,
} from 'src/models/coffee-shop-presence';
import {
  buildCoffeeShopParticipant,
  listCoffeeShopParticipants,
} from 'src/utils/coffee-shop-participants';
import {
  COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
  COFFEE_SHOP_PARTICIPANT_LEFT_EVENT,
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

const parseCoffeeShopId = async (params: Promise<{ id: string }>) => {
  const { id } = await params;
  const coffeeShopId = Number.parseInt(id, 10);

  if (Number.isNaN(coffeeShopId)) {
    return { error: response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST) };
  }

  const coffeeShop = await getCoffeeShopById(coffeeShopId);

  if (!coffeeShop) {
    return { error: response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND) };
  }

  return { coffeeShopId };
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const parsed = await parseCoffeeShopId(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const { coffeeShopId } = parsed;
    await upsertCoffeeShopPresence(coffeeShopId, userId);

    const participant = await buildCoffeeShopParticipant(userId);
    if (!participant) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(
        coffeeShopChatChannel(coffeeShopId),
        COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
        participant,
      );
    }

    return response({ participant }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Presence - Join', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const parsed = await parseCoffeeShopId(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const { coffeeShopId } = parsed;
    await removeCoffeeShopPresence(coffeeShopId, userId);

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(coffeeShopChatChannel(coffeeShopId), COFFEE_SHOP_PARTICIPANT_LEFT_EVENT, {
        userId,
      });
    }

    return response({ ok: true }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Presence - Leave', error as Error);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const parsed = await parseCoffeeShopId(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const participants = await listCoffeeShopParticipants(parsed.coffeeShopId);
    return response({ participants }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Presence - List', error as Error);
  }
}
