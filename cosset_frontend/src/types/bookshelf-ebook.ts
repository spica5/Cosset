export type BookshelfEbookFileType = 'pdf' | 'txt';

export type IBookshelfEbook = {
  id: number;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  fileType: BookshelfEbookFileType;
  order?: number | null;
  createdAt?: string | Date | null;
};
