import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getJourneyDiaryRepresentativePictures } from 'src/models/journey-diary-representative-pictures';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const journeyGroupKey = searchParams.get('journeyGroupKey') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const ownerId = customerId ?? userId;
    const pictures = await getJourneyDiaryRepresentativePictures(
      ownerId,
      journeyGroupKey,
      limit,
      offset,
    );

    return response({ pictures }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Representative Picture - Get list', error as Error);
  }
}
