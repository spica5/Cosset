import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createJourneyDiaryNote } from 'src/models/journey-diary-notes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const note = body?.note;

    if (!note) {
      return response({ message: 'Note data is required' }, STATUS.BAD_REQUEST);
    }

    if (!note.journeyGroupKey || !note.title?.trim() || !note.content?.trim()) {
      return response(
        { message: 'journeyGroupKey, title, and content are required' },
        STATUS.BAD_REQUEST,
      );
    }

    const created = await createJourneyDiaryNote({
      userId: note.userId || null,
      journeyGroupKey: note.journeyGroupKey,
      journeyYear: Number(note.journeyYear),
      journeyMonth: Number(note.journeyMonth),
      journeyCountry: note.journeyCountry?.trim() || 'Journey',
      pictureId: note.pictureId ?? null,
      imageKey: note.imageKey?.trim() || null,
      title: note.title.trim(),
      content: note.content.trim(),
      noteDate: note.noteDate ?? null,
      sortOrder: note.sortOrder ?? 0,
    });

    return response({ note: created }, STATUS.CREATED);
  } catch (error) {
    return handleError('Journey Diary Note - Create', error as Error);
  }
}
