import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { BookshelfBookCategory } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

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

export const getBookshelfEbookListEndpoint = (customerId?: string | number | '' | null) => {
  const normalized = String(customerId ?? '').trim();
  return normalized
    ? `${endpoints.bookshelf.ebook.list}?customerId=${encodeURIComponent(normalized)}`
    : null;
};

export function useGetBookshelfEbooks(customerId?: string | number | '' | null) {
  const url = getBookshelfEbookListEndpoint(customerId);

  const { data, isLoading, error, isValidating } = useSWR<EbooksData>(
    url,
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
  const listEndpoint = getBookshelfEbookListEndpoint(ebook.customerId || createdEbook?.customerId);

  if (createdEbook && listEndpoint) {
    await mutate<EbooksData>(
      listEndpoint,
      (current) => ({
        ...current,
        ebooks: [createdEbook, ...(current?.ebooks || [])],
      }),
      false,
    );
  }

  if (listEndpoint) {
    await mutate(listEndpoint);
  }
  return res.data;
}

export async function updateBookshelfEbook(id: string | number, updates: Partial<IBookshelfEbook>) {
  const res = await axios.put(endpoints.bookshelf.ebook.update(id), { updates });

  const updatedEbook = res.data?.ebook as IBookshelfEbook | undefined;
  const normalizedId = String(id);
  const listEndpoint = getBookshelfEbookListEndpoint(
    updates.customerId || updatedEbook?.customerId,
  );

  if (updatedEbook && listEndpoint) {
    mutate<EbooksData>(
      listEndpoint,
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

  if (listEndpoint) {
    await Promise.all([
      mutate(listEndpoint),
      mutate(endpoints.bookshelf.ebook.details(id)),
    ]);
  }
  return res.data;
}

export async function setBookshelfEbookCategory(
  id: string | number,
  category: BookshelfBookCategory | null,
) {
  return updateBookshelfEbook(id, { category });
}

export async function deleteBookshelfEbook(
  id: string | number,
  customerId?: string | number | '' | null,
) {
  const res = await axios.delete(endpoints.bookshelf.ebook.delete(id));

  const normalizedId = String(id);
  const listEndpoint = getBookshelfEbookListEndpoint(customerId);

  if (listEndpoint) {
    mutate<EbooksData>(
      listEndpoint,
      (current) => ({
        ...current,
        ebooks: (current?.ebooks || []).filter((item) => String(item.id) !== normalizedId),
      }),
      false,
    );

    await mutate(listEndpoint);
  }
  return res.data;
}
