import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';
import type { BookshelfBookGenre } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

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

export const getBookshelfAudiobookListEndpoint = (customerId?: string | number | '' | null) => {
  const normalized = String(customerId ?? '').trim();
  return normalized
    ? `${endpoints.bookshelf.audiobook.list}?customerId=${encodeURIComponent(normalized)}`
    : null;
};

export function useGetBookshelfAudiobooks(customerId?: string | number | '' | null) {
  const url = getBookshelfAudiobookListEndpoint(customerId);

  const { data, isLoading, error, isValidating } = useSWR<AudiobooksData>(
    url,
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
  const listEndpoint = getBookshelfAudiobookListEndpoint(
    audiobook.customerId || createdAudiobook?.customerId,
  );

  if (createdAudiobook && listEndpoint) {
    await mutate<AudiobooksData>(
      listEndpoint,
      (current) => ({
        ...current,
        audiobooks: [createdAudiobook, ...(current?.audiobooks || [])],
      }),
      false,
    );
  }

  if (listEndpoint) {
    await mutate(listEndpoint);
  }
  return res.data;
}

export async function updateBookshelfAudiobook(
  id: string | number,
  updates: Partial<IBookshelfAudiobook>,
) {
  const res = await axios.put(endpoints.bookshelf.audiobook.update(id), { updates });

  const updatedAudiobook = res.data?.audiobook as IBookshelfAudiobook | undefined;
  const normalizedId = String(id);
  const listEndpoint = getBookshelfAudiobookListEndpoint(
    updates.customerId || updatedAudiobook?.customerId,
  );

  if (updatedAudiobook && listEndpoint) {
    mutate<AudiobooksData>(
      listEndpoint,
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
        audiobook: current?.audiobook
          ? { ...current.audiobook, ...updatedAudiobook }
          : updatedAudiobook,
      }),
      false,
    );
  }

  if (listEndpoint) {
    await Promise.all([
      mutate(listEndpoint),
      mutate(endpoints.bookshelf.audiobook.details(id)),
    ]);
  }
  return res.data;
}

export async function setBookshelfAudiobookCategory(
  id: string | number,
  category: BookshelfBookGenre | null,
) {
  return updateBookshelfAudiobook(id, { category });
}

export async function setBookshelfAudiobookFavorite(id: string | number, isFavorite: boolean) {
  return updateBookshelfAudiobook(id, { isFavorite: isFavorite ? 1 : 0 });
}

export async function deleteBookshelfAudiobook(
  id: string | number,
  customerId?: string | number | '' | null,
) {
  const res = await axios.delete(endpoints.bookshelf.audiobook.delete(id));

  const normalizedId = String(id);
  const listEndpoint = getBookshelfAudiobookListEndpoint(customerId);

  if (listEndpoint) {
    mutate<AudiobooksData>(
      listEndpoint,
      (current) => ({
        ...current,
        audiobooks: (current?.audiobooks || []).filter((item) => String(item.id) !== normalizedId),
      }),
      false,
    );

    await mutate(listEndpoint);
  }
  return res.data;
}
