export type BookshelfBorrowStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled' | 'expired';
export type BookshelfBorrowBookKind = 'ebook' | 'audiobook';

export type IBookshelfBorrowMeta = {
  borrowId: number;
  status: BookshelfBorrowStatus;
  ownerCustomerId: string;
  ownerName?: string | null;
  borrowedAt?: string | Date | null;
  borrowPeriodDays?: number | null;
  expiresAt?: string | Date | null;
};

export type IBookshelfBorrow = {
  id: number;
  borrowerCustomerId: string;
  ownerCustomerId: string;
  bookKind: BookshelfBorrowBookKind;
  bookId: number;
  status: BookshelfBorrowStatus;
  requestedAt?: string | Date | null;
  respondedAt?: string | Date | null;
  borrowPeriodDays?: number | null;
  expiresAt?: string | Date | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCoverImage?: string | null;
  bookFileType?: string | null;
  bookCategory?: string | null;
  bookFileUrl?: string | null;
  bookRefUrl?: string | null;
  bookDescription?: string | null;
  bookCreatedAt?: string | Date | null;
  counterpartyName?: string | null;
};
