import type {
  IBookshelfEbookBookmark,
  IBookshelfEbookReadingComment,
  IBookshelfEbookReadingCount,
} from 'src/types/bookshelf-ebook-reading';

import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const bookmarksUrl = (bookId: string | number, customerId: string) =>
  `${endpoints.bookshelf.ebook.readingBookmarks}?bookId=${encodeURIComponent(String(bookId))}&customerId=${encodeURIComponent(customerId)}`;

const commentsUrl = (bookId: string | number, customerId: string) =>
  `${endpoints.bookshelf.ebook.readingComments}?bookId=${encodeURIComponent(String(bookId))}&customerId=${encodeURIComponent(customerId)}`;

const readingCountsUrl = (bookIds: number[], customerId: string) =>
  `${endpoints.bookshelf.ebook.readingCounts}?bookIds=${bookIds.join(',')}&customerId=${encodeURIComponent(customerId)}`;

const revalidateReadingCounts = (_bookId: string | number, customerId: string | number) => {
  mutate(
    (key) =>
      typeof key === 'string' &&
      key.startsWith(endpoints.bookshelf.ebook.readingCounts) &&
      key.includes(`customerId=${encodeURIComponent(String(customerId))}`),
  );
};

export const normalizeReadingCountBookId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

// ----------------------------------------------------------------------

type BookmarksData = {
  bookmarks?: IBookshelfEbookBookmark[];
};

export function useGetBookshelfEbookBookmarks(
  bookId: string | number | '',
  customerId?: string | number | '',
) {
  const url =
    bookId && customerId ? bookmarksUrl(bookId, String(customerId)) : null;

  const { data, isLoading, error, isValidating } = useSWR<BookmarksData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      bookmarks: data?.bookmarks || [],
      bookmarksLoading: isLoading,
      bookmarksError: error,
      bookmarksValidating: isValidating,
      refreshBookmarks: () => (url ? mutate(url) : Promise.resolve(undefined)),
    }),
    [data?.bookmarks, error, isLoading, isValidating, url],
  );
}

export async function addBookshelfEbookBookmark(params: {
  bookId: string | number;
  customerId: string | number;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  label?: string | null;
}) {
  const res = await axios.post(endpoints.bookshelf.ebook.readingBookmarks, params);
  mutate(bookmarksUrl(params.bookId, String(params.customerId)));
  revalidateReadingCounts(params.bookId, params.customerId);
  return res.data;
}

export async function deleteBookshelfEbookBookmark(params: {
  bookmarkId: string | number;
  bookId: string | number;
  customerId: string | number;
}) {
  const res = await axios.delete(
    endpoints.bookshelf.ebook.readingBookmarkDelete(params.bookmarkId),
  );
  mutate(bookmarksUrl(params.bookId, String(params.customerId)));
  revalidateReadingCounts(params.bookId, params.customerId);
  return res.data;
}

// ----------------------------------------------------------------------

type CommentsData = {
  comments?: IBookshelfEbookReadingComment[];
};

export function useGetBookshelfEbookReadingComments(
  bookId: string | number | '',
  customerId?: string | number | '',
) {
  const url =
    bookId && customerId ? commentsUrl(bookId, String(customerId)) : null;

  const { data, isLoading, error, isValidating } = useSWR<CommentsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      comments: data?.comments || [],
      commentsLoading: isLoading,
      commentsError: error,
      commentsValidating: isValidating,
      refreshComments: () => (url ? mutate(url) : Promise.resolve(undefined)),
    }),
    [data?.comments, error, isLoading, isValidating, url],
  );
}

export async function addBookshelfEbookReadingComment(params: {
  bookId: string | number;
  customerId: string | number;
  comment: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
}) {
  const res = await axios.post(endpoints.bookshelf.ebook.readingComments, params);
  mutate(commentsUrl(params.bookId, String(params.customerId)));
  revalidateReadingCounts(params.bookId, params.customerId);
  return res.data;
}

export async function deleteBookshelfEbookReadingComment(params: {
  commentId: string | number;
  bookId: string | number;
  customerId: string | number;
}) {
  const res = await axios.delete(
    endpoints.bookshelf.ebook.readingCommentDelete(params.commentId),
  );
  mutate(commentsUrl(params.bookId, String(params.customerId)));
  revalidateReadingCounts(params.bookId, params.customerId);
  return res.data;
}

// ----------------------------------------------------------------------

type ReadingCountsData = {
  counts?: IBookshelfEbookReadingCount[];
};

const countsSwrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

export async function revalidateBookshelfEbookReadingCounts(
  customerId: string | number,
  bookId?: string | number,
) {
  revalidateReadingCounts(bookId ?? 0, customerId);
}

export function useGetBookshelfEbookReadingCounts(
  bookIds: number[],
  customerId?: string | number | '',
) {
  const normalizedIds = useMemo(
    () => [...new Set(bookIds.map((id) => normalizeReadingCountBookId(id)).filter((id): id is number => id !== null))].sort((a, b) => a - b),
    [bookIds],
  );

  const url =
    customerId && normalizedIds.length
      ? readingCountsUrl(normalizedIds, String(customerId))
      : null;

  const { data, isLoading, error, isValidating } = useSWR<ReadingCountsData>(url, fetcher, countsSwrOptions);

  const countsByBookId = useMemo(() => {
    const map = new Map<number, IBookshelfEbookReadingCount>();

    (data?.counts || []).forEach((item) => {
      const bookId = normalizeReadingCountBookId(item.bookId);
      if (bookId === null) {
        return;
      }

      map.set(bookId, {
        bookId,
        bookmarkCount: Number(item.bookmarkCount) || 0,
        commentCount: Number(item.commentCount) || 0,
      });
    });

    normalizedIds.forEach((bookId) => {
      if (!map.has(bookId)) {
        map.set(bookId, { bookId, bookmarkCount: 0, commentCount: 0 });
      }
    });

    return map;
  }, [data?.counts, normalizedIds]);

  return useMemo(
    () => ({
      countsByBookId,
      readingCountsLoading: isLoading,
      readingCountsError: error,
      readingCountsValidating: isValidating,
      refreshReadingCounts: () => (url ? mutate(url) : Promise.resolve(undefined)),
    }),
    [countsByBookId, error, isLoading, isValidating, url],
  );
}
