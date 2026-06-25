import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';
import type { IBookshelfBorrow, BookshelfBorrowBookKind, BookshelfBorrowStatus } from 'src/types/bookshelf-borrow';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

import { getBookshelfEbookListEndpoint } from 'src/actions/bookshelf-ebook';
import { getBookshelfAudiobookListEndpoint } from 'src/actions/bookshelf-audiobook';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type BorrowsData = {
  borrows?: IBookshelfBorrow[];
};

export const buildBookshelfBorrowListUrl = (
  customerId?: string,
  role: 'borrower' | 'owner' | 'all' = 'all',
  status: BookshelfBorrowStatus | 'all' = 'all',
) => {
  const normalized = (customerId || '').trim();
  if (!normalized) {
    return null;
  }

  const params = new URLSearchParams({
    customerId: normalized,
    role,
    status,
    limit: '200',
    offset: '0',
  });

  return `${endpoints.bookshelf.borrow.list}?${params.toString()}`;
};

export const buildBookshelfBorrowStatusUrl = (
  borrowerCustomerId?: string,
  ownerCustomerId?: string,
  bookIds?: number[],
) => {
  const borrower = (borrowerCustomerId || '').trim();
  const owner = (ownerCustomerId || '').trim();

  if (!borrower || !owner) {
    return null;
  }

  const params = new URLSearchParams({
    borrowerCustomerId: borrower,
    ownerCustomerId: owner,
  });

  if (bookIds?.length) {
    params.set('bookIds', bookIds.join(','));
  }

  return `${endpoints.bookshelf.borrow.status}?${params.toString()}`;
};

const revalidateBorrowCaches = async (customerId?: string) => {
  const normalized = (customerId || '').trim();
  if (!normalized) {
    return;
  }

  await Promise.all([
    mutate(buildBookshelfBorrowListUrl(normalized, 'borrower', 'all')),
    mutate(buildBookshelfBorrowListUrl(normalized, 'owner', 'all')),
    mutate(buildBookshelfBorrowListUrl(normalized, 'owner', 'pending')),
    mutate(buildBookshelfBorrowListUrl(normalized, 'borrower', 'approved')),
    mutate(getBookshelfEbookListEndpoint(normalized)),
    mutate(getBookshelfAudiobookListEndpoint(normalized)),
  ]);
};

export function useGetBookshelfBorrows(
  customerId?: string,
  role: 'borrower' | 'owner' | 'all' = 'all',
  status: BookshelfBorrowStatus | 'all' = 'all',
) {
  const url = buildBookshelfBorrowListUrl(customerId, role, status);

  const { data, isLoading, error, isValidating } = useSWR<BorrowsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      borrows: data?.borrows || [],
      borrowsLoading: isLoading,
      borrowsError: error,
      borrowsValidating: isValidating,
      borrowsEmpty: !isLoading && !(data?.borrows || []).length,
    }),
    [data?.borrows, error, isLoading, isValidating],
  );
}

export function useGetBookshelfBorrowStatuses(
  borrowerCustomerId?: string,
  ownerCustomerId?: string,
  bookIds?: number[],
) {
  const url = buildBookshelfBorrowStatusUrl(borrowerCustomerId, ownerCustomerId, bookIds);

  const { data, isLoading, error, isValidating } = useSWR<BorrowsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      borrowStatuses: data?.borrows || [],
      borrowStatusesLoading: isLoading,
      borrowStatusesError: error,
      borrowStatusesValidating: isValidating,
    }),
    [data?.borrows, error, isLoading, isValidating],
  );
}

export function borrowToEbook(borrow: IBookshelfBorrow): IBookshelfEbook {
  return {
    id: borrow.bookId,
    customerId: borrow.ownerCustomerId,
    title: borrow.bookTitle || `Book #${borrow.bookId}`,
    author: borrow.bookAuthor,
    description: borrow.bookDescription,
    coverImage: borrow.bookCoverImage,
    fileUrl: borrow.bookFileUrl,
    refUrl: borrow.bookRefUrl,
    fileType: (borrow.bookFileType as IBookshelfEbook['fileType']) || 'pdf',
    category: (borrow.bookCategory as IBookshelfEbook['category']) || null,
    createdAt: borrow.bookCreatedAt,
    isBorrowed: true,
    borrow: {
      borrowId: borrow.id,
      status: borrow.status,
      ownerCustomerId: borrow.ownerCustomerId,
      ownerName: borrow.counterpartyName,
      borrowedAt: borrow.respondedAt || borrow.requestedAt,
      borrowPeriodDays: borrow.borrowPeriodDays,
      expiresAt: borrow.expiresAt,
    },
  };
}

export function borrowToAudiobook(borrow: IBookshelfBorrow): IBookshelfAudiobook {
  return {
    id: borrow.bookId,
    customerId: borrow.ownerCustomerId,
    title: borrow.bookTitle || `Book #${borrow.bookId}`,
    author: borrow.bookAuthor,
    description: borrow.bookDescription,
    coverImage: borrow.bookCoverImage,
    fileUrl: borrow.bookFileUrl,
    refUrl: borrow.bookRefUrl,
    fileType: (borrow.bookFileType as IBookshelfAudiobook['fileType']) || 'mp3',
    category: (borrow.bookCategory as IBookshelfAudiobook['category']) || null,
    createdAt: borrow.bookCreatedAt,
    isBorrowed: true,
    borrow: {
      borrowId: borrow.id,
      status: borrow.status,
      ownerCustomerId: borrow.ownerCustomerId,
      ownerName: borrow.counterpartyName,
      borrowedAt: borrow.respondedAt || borrow.requestedAt,
      borrowPeriodDays: borrow.borrowPeriodDays,
      expiresAt: borrow.expiresAt,
    },
  };
}

export async function requestBookshelfBorrow(input: {
  borrowerCustomerId: string;
  ownerCustomerId: string;
  bookKind: BookshelfBorrowBookKind;
  bookId: number;
  borrowPeriodDays?: number;
}) {
  const res = await axios.post(endpoints.bookshelf.borrow.add, input);
  const createdBorrow = res.data?.borrow as IBookshelfBorrow | undefined;

  const statusUrls = [
    buildBookshelfBorrowStatusUrl(input.borrowerCustomerId, input.ownerCustomerId),
    buildBookshelfBorrowStatusUrl(input.borrowerCustomerId, input.ownerCustomerId, [
      input.bookId,
    ]),
  ].filter(Boolean) as string[];

  if (createdBorrow) {
    await Promise.all(
      statusUrls.map((statusUrl) =>
        mutate<BorrowsData>(
          statusUrl,
          (current) => {
            const existing = current?.borrows || [];
            const withoutDuplicate = existing.filter(
              (borrow) =>
                !(
                  borrow.bookId === createdBorrow.bookId &&
                  borrow.bookKind === createdBorrow.bookKind &&
                  (borrow.status === 'pending' || borrow.status === 'approved')
                ),
            );

            return {
              ...current,
              borrows: [createdBorrow, ...withoutDuplicate],
            };
          },
          false,
        ),
      ),
    );
  }

  await Promise.all([
    revalidateBorrowCaches(input.borrowerCustomerId),
    revalidateBorrowCaches(input.ownerCustomerId),
    ...statusUrls.map((statusUrl) => mutate(statusUrl)),
  ]);

  return res.data;
}

export async function respondBookshelfBorrow(
  id: string | number,
  actorCustomerId: string,
  status: BookshelfBorrowStatus,
) {
  const res = await axios.patch(endpoints.bookshelf.borrow.update(id), {
    actorCustomerId,
    status,
  });

  await revalidateBorrowCaches(actorCustomerId);

  const borrow = res.data?.borrow as IBookshelfBorrow | undefined;
  if (borrow) {
    await Promise.all([
      revalidateBorrowCaches(borrow.borrowerCustomerId),
      revalidateBorrowCaches(borrow.ownerCustomerId),
      mutate(
        buildBookshelfBorrowStatusUrl(borrow.borrowerCustomerId, borrow.ownerCustomerId),
      ),
    ]);
  }

  return res.data;
}

export function getBookshelfBookPageHref(
  borrow: IBookshelfBorrow,
  viewerCustomerId?: string,
): string | null {
  if (borrow.status !== 'approved') {
    return null;
  }

  const viewerId = String(viewerCustomerId || '').trim();
  if (!viewerId) {
    return null;
  }

  const isBorrower = borrow.borrowerCustomerId === viewerId;
  const isOwner = borrow.ownerCustomerId === viewerId;

  if (isBorrower) {
    return borrow.bookKind === 'audiobook'
      ? paths.dashboard.bookshelf.audioBookBorrow(borrow.id)
      : paths.dashboard.bookshelf.ebookBorrow(borrow.id);
  }

  if (isOwner) {
    return borrow.bookKind === 'audiobook'
      ? paths.dashboard.bookshelf.audioBookWithId(borrow.bookId)
      : paths.dashboard.bookshelf.ebookWithId(borrow.bookId);
  }

  return null;
}

export function splitBookshelfBorrows(borrows: IBookshelfBorrow[]) {
  const pending = borrows.filter((borrow) => borrow.status === 'pending');
  const active = borrows.filter((borrow) => borrow.status === 'approved');
  const history = borrows.filter((borrow) =>
    ['rejected', 'returned', 'cancelled', 'expired'].includes(borrow.status),
  );

  return { pending, active, history };
}
