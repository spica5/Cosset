import type { IBookshelfEbook, BookshelfEbookFileType } from 'src/types/bookshelf-ebook';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

export function detectEbookFileType(fileName: string, mimeType?: string): BookshelfEbookFileType {
  const mime = (mimeType || '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mime === 'text/plain' || ext === 'txt') {
    return 'txt';
  }

  return 'pdf';
}

export function getEbookFileTypeLabel(fileType: BookshelfEbookFileType) {
  return fileType === 'txt' ? 'TXT' : 'PDF';
}

export function filterEbooks(ebooks: IBookshelfEbook[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return ebooks;
  }

  return ebooks.filter(
    (ebook) =>
      ebook.title.toLowerCase().includes(normalized) ||
      (ebook.author || '').toLowerCase().includes(normalized) ||
      (ebook.description || '').toLowerCase().includes(normalized) ||
      getEbookFileTypeLabel(ebook.fileType).toLowerCase().includes(normalized),
  );
}

export async function resolveEbookAssetUrl(asset?: string | null) {
  const normalized = (asset || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return (await getS3SignedUrl(normalized)) || normalized;
}
