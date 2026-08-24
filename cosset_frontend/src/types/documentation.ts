export type DocumentationCategory = 'study' | 'work' | 'life' | 'other';

export type IDocumentationDocument = {
  id: number;
  customerId: string;
  title: string;
  description?: string | null;
  category?: DocumentationCategory | null;
  fileUrl: string;
  fileType: string;
  originalFileName?: string | null;
  fileSizeBytes: number;
  isFavorite?: number | null;
  order?: number | null;
  createdAt?: string | Date | null;
};

export type IDocumentationUsage = {
  documentCount: number;
  totalBytes: number;
};
