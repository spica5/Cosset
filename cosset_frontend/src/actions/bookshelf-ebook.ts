import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const LIST_ENDPOINT = endpoints.bookshelf.ebook.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type EbooksData = {
  ebooks?: IBookshelfEbook[];
};

type EbookData = {
  ebook?: IBookshelfEbook;
};

export function useGetBookshelfEbooks() {
  const { data, isLoading, error, isValidating } = useSWR<EbooksData>(
    LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      ebooks: data?.ebooks || [],
      ebooksLoading: isLoading,
      ebooksError: error,
      ebooksValidating: isValidating,
      ebooksEmpty: !isLoading && !(data?.ebooks || []).length,
    }),
    [data?.ebooks, error, isLoading, isValidating],
  );
}

export function useGetBookshelfEbookById(id: string | number | '') {
  const url = id ? endpoints.bookshelf.ebook.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<EbookData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      ebook: data?.ebook,
      ebookLoading: isLoading,
      ebookError: error,
      ebookValidating: isValidating,
    }),
    [data?.ebook, error, isLoading, isValidating],
  );
}

export async function createBookshelfEbook(ebook: Omit<IBookshelfEbook, 'id' | 'createdAt'>) {
  const res = await axios.post(endpoints.bookshelf.ebook.add, { ebook });
  const createdEbook = res.data?.ebook as IBookshelfEbook | undefined;

  if (createdEbook) {
    await mutate<EbooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        ebooks: [createdEbook, ...(current?.ebooks || [])],
      }),
      false,
    );
  }

  await mutate(LIST_ENDPOINT);
  return res.data;
}

export async function updateBookshelfEbook(id: string | number, updates: Partial<IBookshelfEbook>) {
  const res = await axios.put(endpoints.bookshelf.ebook.update(id), { updates });

  const updatedEbook = res.data?.ebook as IBookshelfEbook | undefined;
  const normalizedId = String(id);

  if (updatedEbook) {
    mutate<EbooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        ebooks: (current?.ebooks || []).map((item) =>
          String(item.id) === normalizedId ? { ...item, ...updatedEbook } : item,
        ),
      }),
      false,
    );

    mutate<EbookData>(
      endpoints.bookshelf.ebook.details(id),
      (current) => ({
        ...current,
        ebook: current?.ebook ? { ...current.ebook, ...updatedEbook } : updatedEbook,
      }),
      false,
    );
  }

  await Promise.all([
    mutate(LIST_ENDPOINT),
    mutate(endpoints.bookshelf.ebook.details(id)),
  ]);
  return res.data;
}

export async function deleteBookshelfEbook(id: string | number) {
  const res = await axios.delete(endpoints.bookshelf.ebook.delete(id));

  const normalizedId = String(id);
  mutate<EbooksData>(
    LIST_ENDPOINT,
    (current) => ({
      ...current,
      ebooks: (current?.ebooks || []).filter((item) => String(item.id) !== normalizedId),
    }),
    false,
  );

  await mutate(LIST_ENDPOINT);
  return res.data;
}
