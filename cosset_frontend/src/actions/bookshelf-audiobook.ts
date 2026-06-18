import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const LIST_ENDPOINT = endpoints.bookshelf.audiobook.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type AudiobooksData = {
  audiobooks?: IBookshelfAudiobook[];
};

type AudiobookData = {
  audiobook?: IBookshelfAudiobook;
};

export function useGetBookshelfAudiobooks() {
  const { data, isLoading, error, isValidating } = useSWR<AudiobooksData>(
    LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      audiobooks: data?.audiobooks || [],
      audiobooksLoading: isLoading,
      audiobooksError: error,
      audiobooksValidating: isValidating,
      audiobooksEmpty: !isLoading && !(data?.audiobooks || []).length,
    }),
    [data?.audiobooks, error, isLoading, isValidating],
  );
}

export function useGetBookshelfAudiobookById(id: string | number | '') {
  const url = id ? endpoints.bookshelf.audiobook.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<AudiobookData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      audiobook: data?.audiobook,
      audiobookLoading: isLoading,
      audiobookError: error,
      audiobookValidating: isValidating,
    }),
    [data?.audiobook, error, isLoading, isValidating],
  );
}

export async function createBookshelfAudiobook(
  audiobook: Omit<IBookshelfAudiobook, 'id' | 'createdAt'>,
) {
  const res = await axios.post(endpoints.bookshelf.audiobook.add, { audiobook });
  const createdAudiobook = res.data?.audiobook as IBookshelfAudiobook | undefined;

  if (createdAudiobook) {
    await mutate<AudiobooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        audiobooks: [createdAudiobook, ...(current?.audiobooks || [])],
      }),
      false,
    );
  }

  await mutate(LIST_ENDPOINT);
  return res.data;
}

export async function updateBookshelfAudiobook(
  id: string | number,
  updates: Partial<IBookshelfAudiobook>,
) {
  const res = await axios.put(endpoints.bookshelf.audiobook.update(id), { updates });

  const updatedAudiobook = res.data?.audiobook as IBookshelfAudiobook | undefined;
  const normalizedId = String(id);

  if (updatedAudiobook) {
    mutate<AudiobooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        audiobooks: (current?.audiobooks || []).map((item) =>
          String(item.id) === normalizedId ? { ...item, ...updatedAudiobook } : item,
        ),
      }),
      false,
    );

    mutate<AudiobookData>(
      endpoints.bookshelf.audiobook.details(id),
      (current) => ({
        ...current,
        audiobook: current?.audiobook ? { ...current.audiobook, ...updatedAudiobook } : updatedAudiobook,
      }),
      false,
    );
  }

  await Promise.all([
    mutate(LIST_ENDPOINT),
    mutate(endpoints.bookshelf.audiobook.details(id)),
  ]);
  return res.data;
}

export async function deleteBookshelfAudiobook(id: string | number) {
  const res = await axios.delete(endpoints.bookshelf.audiobook.delete(id));

  const normalizedId = String(id);
  mutate<AudiobooksData>(
    LIST_ENDPOINT,
    (current) => ({
      ...current,
      audiobooks: (current?.audiobooks || []).filter((item) => String(item.id) !== normalizedId),
    }),
    false,
  );

  await mutate(LIST_ENDPOINT);
  return res.data;
}
