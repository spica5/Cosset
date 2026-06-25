import type { IBookshelfEbook, BookshelfEbookFileType } from 'src/types/bookshelf-ebook';

import { getS3SignedUrl } from 'src/utils/helper';

import { getBookCategoryLabel, isBookFavorite } from './bookshelf-book-categories';

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
      getEbookFileTypeLabel(ebook.fileType).toLowerCase().includes(normalized) ||
      getBookCategoryLabel(ebook.category).toLowerCase().includes(normalized),
  );
}

export function filterEbooksByCategory<
  T extends { category?: string | null; isBorrowed?: boolean; isFavorite?: boolean | number | null },
>(ebooks: T[], category?: string | null) {
  const normalized = String(category || '').trim().toLowerCase();

  if (!normalized) {
    return ebooks;
  }

  if (normalized === 'borrowed') {
    return ebooks.filter((ebook) => ebook.isBorrowed);
  }

  if (normalized === 'favorite') {
    return ebooks.filter((ebook) => !ebook.isBorrowed && isBookFavorite(ebook.isFavorite));
  }

  return ebooks.filter(
    (ebook) => !ebook.isBorrowed && String(ebook.category || '').toLowerCase() === normalized,
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

export function detectEbookFileTypeFromUrl(url: string): BookshelfEbookFileType {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.txt')) {
      return 'txt';
    }
  } catch {
    // ignore invalid URLs during detection
  }

  return 'pdf';
}

export function isHttpUrl(value: string) {
  const normalized = value.trim();
  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

export async function resolveEbookContentUrl(
  ebook: Pick<IBookshelfEbook, 'fileUrl' | 'refUrl'>,
) {
  const refUrl = (ebook.refUrl || '').trim();
  if (refUrl) {
    return refUrl;
  }

  return resolveEbookAssetUrl(ebook.fileUrl);
}

export function getEbookSourceType(ebook: Pick<IBookshelfEbook, 'fileUrl' | 'refUrl'>) {
  return (ebook.refUrl || '').trim() ? 'url' : 'file';
}
