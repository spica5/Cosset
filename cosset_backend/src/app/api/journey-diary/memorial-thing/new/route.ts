import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { syncJourneyDiaryMemorialThingImages } from 'src/models/journey-diary-memorial-thing-images';
import { createJourneyDiaryMemorialThing } from 'src/models/journey-diary-memorial-things';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const VALID_CATEGORIES = new Set(['scenery', 'food', 'culture', 'people', 'special_events']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memorialThing = body?.memorialThing;

    if (!memorialThing) {
      return response({ message: 'Memorial thing data is required' }, STATUS.BAD_REQUEST);
    }

    const imageKeys: string[] = Array.isArray(memorialThing.imageKeys)
      ? memorialThing.imageKeys.filter((key: string) => Boolean(key?.trim()))
      : memorialThing.imageKey
        ? [memorialThing.imageKey.trim()]
        : [];

    if (
      !memorialThing.journeyGroupKey ||
      !memorialThing.title?.trim() ||
      !memorialThing.category ||
      !VALID_CATEGORIES.has(memorialThing.category)
    ) {
      return response(
        { message: 'journeyGroupKey, title, and a valid category are required' },
        STATUS.BAD_REQUEST,
      );
    }

    const created = await createJourneyDiaryMemorialThing({
      userId: memorialThing.userId || null,
      journeyGroupKey: memorialThing.journeyGroupKey,
      journeyYear: Number(memorialThing.journeyYear),
      journeyMonth: Number(memorialThing.journeyMonth),
      journeyCountry: memorialThing.journeyCountry?.trim() || 'Journey',
      category: memorialThing.category,
      title: memorialThing.title.trim(),
      description: memorialThing.description?.trim() || null,
      pictureId: null,
      imageKey: imageKeys[0] || null,
      memorialDate: memorialThing.memorialDate ?? null,
      sortOrder: memorialThing.sortOrder ?? 0,
    });

    const images = await syncJourneyDiaryMemorialThingImages(created.id, imageKeys);

    return response({ memorialThing: { ...created, images } }, STATUS.CREATED);
  } catch (error) {
    return handleError('Journey Diary Memorial Thing - Create', error as Error);
  }
}
