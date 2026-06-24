export type BookshelfEbookFileType = 'pdf' | 'txt';
export type BookshelfEbookCategory = 'favorite' | 'important';

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
  order?: number | null;
  isPublic?: number | null;
  createdAt?: string | Date | null;
};
