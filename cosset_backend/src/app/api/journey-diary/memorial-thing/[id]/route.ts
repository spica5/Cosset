import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getJourneyDiaryMemorialThingImages,
  syncJourneyDiaryMemorialThingImages,
} from 'src/models/journey-diary-memorial-thing-images';
import {
  deleteJourneyDiaryMemorialThing,
  getJourneyDiaryMemorialThingById,
  updateJourneyDiaryMemorialThing,
} from 'src/models/journey-diary-memorial-things';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const VALID_CATEGORIES = new Set(['scenery', 'food', 'culture', 'people', 'special_events']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memorialThingId = parseInt(id, 10);

    const memorialThing = await getJourneyDiaryMemorialThingById(memorialThingId);

    if (!memorialThing) {
      return response({ message: 'Memorial thing not found' }, STATUS.NOT_FOUND);
    }

    const images = await getJourneyDiaryMemorialThingImages(memorialThingId);

    return response({
      memorialThing: {
        ...memorialThing,
        images: images.length
          ? images
          : memorialThing.imageKey
            ? [
                {
                  id: -memorialThing.id,
                  memorialThingId: memorialThing.id,
                  imageKey: memorialThing.imageKey,
                  sortOrder: 0,
                },
              ]
            : [],
      },
    }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Memorial Thing - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memorialThingId = parseInt(id, 10);
    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.category && !VALID_CATEGORIES.has(updates.category)) {
      return response({ message: 'Invalid category' }, STATUS.BAD_REQUEST);
    }

    const imageKeys = Array.isArray(updates.imageKeys)
      ? updates.imageKeys.filter((key: string) => Boolean(key?.trim()))
      : undefined;

    const updated = await updateJourneyDiaryMemorialThing(memorialThingId, {
      category: updates.category,
      title: updates.title?.trim(),
      description: updates.description?.trim() ?? null,
      pictureId: null,
      imageKey: imageKeys ? imageKeys[0] || null : updates.imageKey ?? null,
      memorialDate: updates.memorialDate ?? null,
      sortOrder: updates.sortOrder,
    });

    const images =
      imageKeys !== undefined
        ? await syncJourneyDiaryMemorialThingImages(memorialThingId, imageKeys)
        : await getJourneyDiaryMemorialThingImages(memorialThingId);

    return response({ memorialThing: { ...updated, images } }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Memorial Thing - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memorialThingId = parseInt(id, 10);

    const deleted = await deleteJourneyDiaryMemorialThing(memorialThingId);

    if (!deleted) {
      return response({ message: 'Memorial thing not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Memorial thing deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Memorial Thing - Delete', error as Error);
  }
}
