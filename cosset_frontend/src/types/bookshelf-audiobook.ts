export type BookshelfAudiobookFileType = 'mp3' | 'm4a' | 'wav' | 'ogg' | 'aac' | 'flac';
export type BookshelfAudiobookCategory = 'favorite' | 'important';

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
  order?: number | null;
  isPublic?: number | null;
  createdAt?: string | Date | null;
};
