import type { IBookshelfIntroduceBook } from 'src/types/bookshelf-introduce-book';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const LIST_ENDPOINT = endpoints.bookshelf.introduce.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type BooksData = {
  books?: IBookshelfIntroduceBook[];
};

type BookData = {
  book?: IBookshelfIntroduceBook;
};

export function useGetBookshelfIntroduceBooks() {
  const { data, isLoading, error, isValidating } = useSWR<BooksData>(
    LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      books: data?.books || [],
      booksLoading: isLoading,
      booksError: error,
      booksValidating: isValidating,
      booksEmpty: !isLoading && !(data?.books || []).length,
    }),
    [data?.books, error, isLoading, isValidating],
  );
}

export function useGetBookshelfIntroduceBook(id: string | number | '') {
  const url = id ? endpoints.bookshelf.introduce.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<BookData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      book: data?.book,
      bookLoading: isLoading,
      bookError: error,
      bookValidating: isValidating,
    }),
    [data?.book, error, isLoading, isValidating],
  );
}

export async function createBookshelfIntroduceBook(
  book: Omit<IBookshelfIntroduceBook, 'id' | 'createdAt'>,
) {
  const res = await axios.post(endpoints.bookshelf.introduce.add, { book });
  const createdBook = res.data?.book as IBookshelfIntroduceBook | undefined;

  if (createdBook) {
    await mutate<BooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        books: [createdBook, ...(current?.books || [])],
      }),
      false,
    );
  }

  await mutate(LIST_ENDPOINT);
  return res.data;
}

export async function updateBookshelfIntroduceBook(
  id: string | number,
  updates: Partial<IBookshelfIntroduceBook>,
) {
  const res = await axios.put(endpoints.bookshelf.introduce.update(id), { updates });

  const updatedBook = res.data?.book as IBookshelfIntroduceBook | undefined;
  const normalizedId = String(id);

  if (updatedBook) {
    mutate<BooksData>(
      LIST_ENDPOINT,
      (current) => ({
        ...current,
        books: (current?.books || []).map((item) =>
          String(item.id) === normalizedId ? { ...item, ...updatedBook } : item,
        ),
      }),
      false,
    );

    mutate<BookData>(
      endpoints.bookshelf.introduce.details(id),
      (current) => ({
        ...current,
        book: current?.book ? { ...current.book, ...updatedBook } : updatedBook,
      }),
      false,
    );
  }

  await Promise.all([
    mutate(LIST_ENDPOINT),
    mutate(endpoints.bookshelf.introduce.details(id)),
  ]);
  return res.data;
}

export async function deleteBookshelfIntroduceBook(id: string | number) {
  const res = await axios.delete(endpoints.bookshelf.introduce.delete(id));

  const normalizedId = String(id);
  mutate<BooksData>(
    LIST_ENDPOINT,
    (current) => ({
      ...current,
      books: (current?.books || []).filter((item) => String(item.id) !== normalizedId),
    }),
    false,
  );

  await mutate(LIST_ENDPOINT);
  return res.data;
}
