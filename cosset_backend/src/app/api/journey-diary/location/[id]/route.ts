import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  deleteJourneyDiaryLocation,
  getJourneyDiaryLocationById,
  updateJourneyDiaryLocation,
} from 'src/models/journey-diary-locations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const locationId = parseInt(id, 10);

    const location = await getJourneyDiaryLocationById(locationId);

    if (!location) {
      return response({ message: 'Location not found' }, STATUS.NOT_FOUND);
    }

    return response({ location }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Location - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const locationId = parseInt(id, 10);
    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const updated = await updateJourneyDiaryLocation(locationId, {
      journeyName: updates.journeyName ?? null,
      location: updates.location,
      city: updates.city ?? null,
      country: updates.country ?? null,
      latitude: updates.latitude ?? null,
      longitude: updates.longitude ?? null,
      representativeImage: updates.representativeImage ?? null,
      visitedAt: updates.visitedAt ?? null,
      endAt: updates.endAt ?? null,
      notes: updates.notes ?? null,
    });

    return response({ location: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Location - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const locationId = parseInt(id, 10);

    const deleted = await deleteJourneyDiaryLocation(locationId);

    if (!deleted) {
      return response({ message: 'Location not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Location deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Location - Delete', error as Error);
  }
}
