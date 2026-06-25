import type { BookshelfBookGenre } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import type { IBookshelfBorrowMeta } from './bookshelf-borrow';

export type BookshelfAudiobookFileType = 'mp3' | 'm4a' | 'wav' | 'ogg' | 'aac' | 'flac';
export type BookshelfAudiobookCategory = BookshelfBookGenre;

export type IBookshelfAudiobook = {
  id: number;
  customerId?: string | null;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl?: string | null;
  refUrl?: string | null;
  fileType: BookshelfAudiobookFileType;
  category?: BookshelfAudiobookCategory | null;
  isFavorite?: boolean | number | null;
  order?: number | null;
  isPublic?: number | null;
  createdAt?: string | Date | null;
  borrow?: IBookshelfBorrowMeta | null;
  isBorrowed?: boolean;
};
