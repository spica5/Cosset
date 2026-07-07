import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { endpoints, fetcher } from 'src/utils/axios';

const NOTE_LIST_ENDPOINT = endpoints.journeyDiary.note.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type NotesData = {
  notes: IJourneyDiaryNote[];
};

export function useGetJourneyDiaryNotes(
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const params = new URLSearchParams();

  if (userId) {
    params.set('userId', String(userId));
  }

  if (journeyGroupKey) {
    params.set('journeyGroupKey', journeyGroupKey);
  }

  const url = userId && journeyGroupKey ? `${NOTE_LIST_ENDPOINT}?${params.toString()}` : null;

  const { data, isLoading, error, isValidating } = useSWR<NotesData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      notes: data?.notes || [],
      notesLoading: isLoading,
      notesError: error,
      notesValidating: isValidating,
      notesEmpty: !isLoading && !data?.notes.length,
    }),
    [data?.notes, error, isLoading, isValidating],
  );
}

const revalidateNoteList = (userId?: string | number, journeyGroupKey?: string | null) => {
  if (!userId || !journeyGroupKey) {
    mutate(NOTE_LIST_ENDPOINT);
    return;
  }

  const params = new URLSearchParams({
    userId: String(userId),
    journeyGroupKey,
  });

  mutate(`${NOTE_LIST_ENDPOINT}?${params.toString()}`);
  mutate(NOTE_LIST_ENDPOINT);
};

export async function createJourneyDiaryNote(
  note: Omit<IJourneyDiaryNote, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const res = await axios.post(endpoints.journeyDiary.note.add, { note });
  revalidateNoteList(note.userId || undefined, note.journeyGroupKey);
  return res.data;
}

export async function updateJourneyDiaryNote(
  id: string | number,
  updates: Partial<
    Pick<IJourneyDiaryNote, 'pictureId' | 'imageKey' | 'title' | 'content' | 'noteDate' | 'sortOrder'>
  >,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.put(endpoints.journeyDiary.note.update(id), { updates });
  mutate(endpoints.journeyDiary.note.details(id));
  revalidateNoteList(userId, journeyGroupKey);
  return res.data;
}

export async function deleteJourneyDiaryNote(
  id: string | number,
  userId?: string | number,
  journeyGroupKey?: string | null,
) {
  const res = await axios.delete(endpoints.journeyDiary.note.delete(id));
  revalidateNoteList(userId, journeyGroupKey);
  return res.data;
}
