import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  deleteJourneyDiaryNote,
  getJourneyDiaryNoteById,
  updateJourneyDiaryNote,
} from 'src/models/journey-diary-notes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const noteId = parseInt(id, 10);

    const note = await getJourneyDiaryNoteById(noteId);

    if (!note) {
      return response({ message: 'Note not found' }, STATUS.NOT_FOUND);
    }

    return response({ note }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Note - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const noteId = parseInt(id, 10);
    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const updated = await updateJourneyDiaryNote(noteId, {
      pictureId: updates.pictureId ?? null,
      imageKey: updates.imageKey ?? null,
      title: updates.title?.trim(),
      content: updates.content?.trim(),
      noteDate: updates.noteDate ?? null,
      sortOrder: updates.sortOrder,
    });

    return response({ note: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Note - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const noteId = parseInt(id, 10);

    const deleted = await deleteJourneyDiaryNote(noteId);

    if (!deleted) {
      return response({ message: 'Note not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Note deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Journey Diary Note - Delete', error as Error);
  }
}
