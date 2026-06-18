export type BookshelfAudiobookFileType = 'mp3' | 'm4a' | 'wav' | 'ogg' | 'aac' | 'flac';

export type IBookshelfAudiobook = {
  id: number;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  fileType: BookshelfAudiobookFileType;
  order?: number | null;
  createdAt?: string | Date | null;
};
