import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { normalizeCinemaCategory } from 'src/models/cinema-films';
import {
  listUserCinemaRooms,
  touchCinemaPresence,
  upsertCinemaPresence,
  removeCinemaPresence,
  removeUserFromAllCinemas,
  getCinemaPresenceJoinedAt,
} from 'src/models/cinema-presence';

import { JWT_SECRET } from 'src/config-global';
import { STATUS, handleError, response } from 'src/utils/response';
import { buildCinemaParticipant, listCinemaParticipants } from 'src/utils/cinema-participants';
import {
  getPusherServer,
  cinemaChatChannel,
  CINEMA_PARTICIPANT_LEFT_EVENT,
  CINEMA_PARTICIPANT_JOINED_EVENT,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const { room } = parsed;
    const previousRooms = await listUserCinemaRooms(userId);
    await removeUserFromAllCinemas(userId);
    await upsertCinemaPresence(room, userId);

    const joinedAt = await getCinemaPresenceJoinedAt(room, userId);
    const participant = await buildCinemaParticipant(userId, joinedAt || undefined);
    if (!participant) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const participants = await listCinemaParticipants(room, true);
    const pusher = getPusherServer();

    if (pusher) {
      await Promise.all(
        previousRooms.map((oldRoom) => {
          if (
            oldRoom.ownerCustomerId !== room.ownerCustomerId ||
            oldRoom.category !== room.category
          ) {
            return pusher.trigger(
              cinemaChatChannel(oldRoom.ownerCustomerId, oldRoom.category),
              CINEMA_PARTICIPANT_LEFT_EVENT,
              { userId },
            );
          }
          return Promise.resolve();
        }),
      );

      await pusher.trigger(
        cinemaChatChannel(room.ownerCustomerId, room.category),
        CINEMA_PARTICIPANT_JOINED_EVENT,
        participant,
      );
    }

    return response({ participant, participants }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Presence - Join', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const refreshed = await touchCinemaPresence(parsed.room, userId);
    if (!refreshed) {
      return response({ message: 'Not present in this cinema' }, STATUS.NOT_FOUND);
    }

    return response({ ok: true }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Presence - Touch', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const { room } = parsed;
    await removeCinemaPresence(room, userId);

    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(
        cinemaChatChannel(room.ownerCustomerId, room.category),
        CINEMA_PARTICIPANT_LEFT_EVENT,
        { userId },
      );
    }

    return response({ ok: true }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Presence - Leave', error as Error);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ownerId: string; category: string }> },
) {
  try {
    const parsed = await parseRoom(params);
    if ('error' in parsed && parsed.error) {
      return parsed.error;
    }

    const participants = await listCinemaParticipants(parsed.room, true);
    return response({ participants }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Presence - List', error as Error);
  }
}
