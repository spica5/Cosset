import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
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
    return typeof data?.userId === 'string' && data.userId ? data.userId.trim().toLowerCase() : null;
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to fetch ICE servers' }, STATUS.UNAUTHORIZED);
    }

    const iceServers: RTCIceServerLike[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const turnUrls = String(process.env.WEBRTC_TURN_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const turnUsername = String(process.env.WEBRTC_TURN_USERNAME || '').trim();
    const turnCredential = String(process.env.WEBRTC_TURN_CREDENTIAL || '').trim();

    if (turnUrls.length && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnUrls,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return response({ iceServers }, STATUS.OK);
  } catch (error) {
    return handleError('Chat Call - ICE', error as Error);
  }
}

type RTCIceServerLike = {
  urls: string | string[];
  username?: string;
  credential?: string;
};
