import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  deleteJourneyDiaryRepresentativePicture,
  getJourneyDiaryRepresentativePictureById,
  updateJourneyDiaryRepresentativePicture,
} from 'src/models/journey-diary-representative-pictures';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pictureId = parseInt(id, 10);

    const picture = await getJourneyDiaryRepresentativePictureById(pictureId);

    if (!picture) {
      return response({ message: 'Picture not found' }, STATUS.NOT_FOUND);
    }

    return response({ picture }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Representative Picture - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pictureId = parseInt(id, 10);
    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const updated = await updateJourneyDiaryRepresentativePicture(pictureId, {
      caption: updates.caption ?? null,
      sortOrder: updates.sortOrder,
    });

    return response({ picture: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Representative Picture - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pictureId = parseInt(id, 10);

    const deleted = await deleteJourneyDiaryRepresentativePicture(pictureId);

    if (!deleted) {
      return response({ message: 'Picture not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Picture deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Representative Picture - Delete', error as Error);
  }
}
