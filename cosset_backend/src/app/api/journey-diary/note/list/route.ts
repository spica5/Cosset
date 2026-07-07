import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getJourneyDiaryNotes } from 'src/models/journey-diary-notes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const journeyGroupKey = searchParams.get('journeyGroupKey') || undefined;

    const notes = await getJourneyDiaryNotes(userId, journeyGroupKey);

    return response({ notes }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Notes - List', error as Error);
  }
}
