export type IBookshelfEbookBookmark = {
  id: number;
  bookId: number;
  customerId: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  label?: string | null;
  createdAt?: string | Date | null;
};

export type IBookshelfEbookReadingComment = {
  id: number;
  bookId: number;
  customerId: string;
  pageNumber?: number | null;
  scrollPosition?: number | null;
  comment: string;
  createdAt?: string | Date | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
};

export type IBookshelfEbookReadingCount = {
  bookId: number;
  bookmarkCount: number;
  commentCount: number;
};
