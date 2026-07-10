import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createJourneyDiaryRepresentativePicture } from 'src/models/journey-diary-representative-pictures';
import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const picture = body?.picture;

    if (!picture?.journeyGroupKey || !picture?.imageKey) {
      return response({ message: 'Journey group and image are required' }, STATUS.BAD_REQUEST);
    }

    let inferredUserId: string | null = null;
    const authorization = req.headers.get('authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      const accessToken = authorization.split(' ')[1];
      try {
        const data = await verify(accessToken, JWT_SECRET);
        if (data?.userId) {
          inferredUserId = data.userId;
        }
      } catch {
        // ignore verification errors
      }
    }

    const created = await createJourneyDiaryRepresentativePicture({
      userId: picture.userId || inferredUserId || null,
      journeyGroupKey: String(picture.journeyGroupKey),
      journeyYear: Number(picture.journeyYear),
      journeyMonth: Number(picture.journeyMonth),
      journeyCountry: String(picture.journeyCountry || ''),
      caption: picture.caption?.trim() || null,
      imageKey: String(picture.imageKey),
      sortOrder: picture.sortOrder ?? 0,
      visitedAt: picture.visitedAt || null,
    });

    return response({ picture: created }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Representative Picture - Create', error as Error);
  }
}
