import type { NextRequest } from 'next/server';

import { JWT_SECRET } from 'src/config-global';
import { getCoffeeShopById } from 'src/models/coffee-shops';
import {
  getCoffeeShopPresenceHidden,
  getCoffeeShopPresenceJoinedAt,
  listUserCoffeeShops,
  removeCoffeeShopPresence,
  removeUserFromAllCoffeeShops,
  setCoffeeShopPresenceHidden,
  upsertCoffeeShopPresence,
} from 'src/models/coffee-shop-presence';
import { STATUS, handleError, response } from 'src/utils/response';
import {
  buildCoffeeShopParticipant,
  listCoffeeShopParticipants,
} from 'src/utils/coffee-shop-participants';
import { verify } from 'src/utils/jwt';
import {
  COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
  COFFEE_SHOP_PARTICIPANT_LEFT_EVENT,
  coffeeShopChatChannel,
  getPusherServer,
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
    
    // Get the list of shops the user is currently in
    const previousShops = await listUserCoffeeShops(userId);
    
    // Remove user from all other coffee shops first
    await removeUserFromAllCoffeeShops(userId);
    
    // Then add user to the new coffee shop
    await upsertCoffeeShopPresence(coffeeShopId, userId);
    
    // Get the joinedAt timestamp
    const joinedAt = await getCoffeeShopPresenceJoinedAt(coffeeShopId, userId);

    const participant = await buildCoffeeShopParticipant(userId, joinedAt || undefined);
    if (!participant) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const pusher = getPusherServer();
    if (pusher) {
      // Notify old shops that user left
      await Promise.all(
        previousShops.map((oldShopId) => {
          if (oldShopId !== coffeeShopId) {
            return pusher.trigger(
              coffeeShopChatChannel(oldShopId),
              COFFEE_SHOP_PARTICIPANT_LEFT_EVENT,
              { userId },
            );
          }
          return Promise.resolve();
        })
      );
      
      // Notify new shop that user joined
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

export async function PATCH(
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
    const body = await req.json();
    const { isHidden } = body;

    if (typeof isHidden !== 'boolean') {
      return response({ message: 'Invalid isHidden parameter' }, STATUS.BAD_REQUEST);
    }

    await setCoffeeShopPresenceHidden(coffeeShopId, userId, isHidden);

    const pusher = getPusherServer();
    if (pusher) {
      if (isHidden) {
        await pusher.trigger(coffeeShopChatChannel(coffeeShopId), COFFEE_SHOP_PARTICIPANT_LEFT_EVENT, {
          userId,
        });
      } else {
        const joinedAt = await getCoffeeShopPresenceJoinedAt(coffeeShopId, userId);
        const participant = await buildCoffeeShopParticipant(userId, joinedAt || undefined);
        if (participant) {
          await pusher.trigger(
            coffeeShopChatChannel(coffeeShopId),
            COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
            participant,
          );
        }
      }
    }

    const hidden = await getCoffeeShopPresenceHidden(coffeeShopId, userId);
    return response({ isHidden: hidden }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop Presence - Set Hidden', error as Error);
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
