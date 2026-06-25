import type { BookshelfBookGenre } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import type { IBookshelfBorrowMeta } from './bookshelf-borrow';

export type BookshelfEbookFileType = 'pdf' | 'txt';
export type BookshelfEbookCategory = BookshelfBookGenre;

export type IBookshelfEbook = {
  id: number;
  customerId?: string | null;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl?: string | null;
  refUrl?: string | null;
  fileType: BookshelfEbookFileType;
  category?: BookshelfEbookCategory | null;
  isFavorite?: boolean | number | null;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: string | Date | null;
  borrow?: IBookshelfBorrowMeta | null;
  isBorrowed?: boolean;
};
