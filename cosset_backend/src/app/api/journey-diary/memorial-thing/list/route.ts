import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getJourneyDiaryMemorialThingImagesByThingIds } from 'src/models/journey-diary-memorial-thing-images';
import { getJourneyDiaryMemorialThings } from 'src/models/journey-diary-memorial-things';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const journeyGroupKey = searchParams.get('journeyGroupKey') || undefined;
    const category = searchParams.get('category') || undefined;

    const memorialThings = await getJourneyDiaryMemorialThings(userId, journeyGroupKey, category);
    const images = await getJourneyDiaryMemorialThingImagesByThingIds(
      memorialThings.map((item) => item.id),
    );

    const imagesByThingId = images.reduce<Record<number, typeof images>>((acc, image) => {
      if (!acc[image.memorialThingId]) {
        acc[image.memorialThingId] = [];
      }
      acc[image.memorialThingId].push(image);
      return acc;
    }, {});

    const memorialThingsWithImages = memorialThings.map((item) => {
      const itemImages = imagesByThingId[item.id] || [];

      if (itemImages.length) {
        return { ...item, images: itemImages };
      }

      if (item.imageKey) {
        return {
          ...item,
          images: [
            {
              id: -item.id,
              memorialThingId: item.id,
              imageKey: item.imageKey,
              sortOrder: 0,
            },
          ],
        };
      }

      return { ...item, images: [] };
    });

    return response({ memorialThings: memorialThingsWithImages }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Memorial Things - List', error as Error);
  }
}
