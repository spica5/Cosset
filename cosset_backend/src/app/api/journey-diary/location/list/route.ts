import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getAllJourneyDiaryLocations } from 'src/models/journey-diary-locations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const ownerId = customerId ?? userId;
    const locations = await getAllJourneyDiaryLocations(ownerId, limit, offset);

    return response({ locations }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Location - Get list', error as Error);
  }
}
