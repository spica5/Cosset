import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createJourneyDiaryLocation } from 'src/models/journey-diary-locations';
import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.location;

    if (!entry || !entry.location?.trim()) {
      return response({ message: 'Location is required' }, STATUS.BAD_REQUEST);
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

    const created = await createJourneyDiaryLocation({
      userId: entry.userId || inferredUserId || null,
      journeyName: entry.journeyName?.trim() || null,
      location: entry.location.trim(),
      city: entry.city?.trim() || null,
      country: entry.country?.trim() || null,
      latitude: entry.latitude ?? null,
      longitude: entry.longitude ?? null,
      representativeImage: entry.representativeImage?.trim() || null,
      visitedAt: entry.visitedAt || null,
      endAt: entry.endAt || null,
      notes: entry.notes?.trim() || null,
      companionUserIds: Array.isArray(entry.companionUserIds) ? entry.companionUserIds : [],
    });

    return response({ location: created }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Location - Create', error as Error);
  }
}
