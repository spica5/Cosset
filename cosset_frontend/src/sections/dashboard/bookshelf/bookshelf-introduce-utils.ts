import type { IBookshelfIntroduce } from 'src/types/bookshelf-introduce';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

export const SHELF_COUNT = 3;
export const BOOKS_PER_SHELF = 5;

export function splitBooksIntoShelves(
  books: IBookshelfIntroduce[],
  shelfCount = SHELF_COUNT,
  booksPerShelf = BOOKS_PER_SHELF,
) {
  const shelves: IBookshelfIntroduce[][] = Array.from({ length: shelfCount }, () => []);

  books.forEach((book, index) => {
    const shelfIndex = Math.min(Math.floor(index / booksPerShelf), shelfCount - 1);
    if (shelves[shelfIndex].length < booksPerShelf) {
      shelves[shelfIndex].push(book);
    }
  });

  return shelves;
}

export function filterIntroduceBooks(books: IBookshelfIntroduce[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return books;
  }

  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(normalized) ||
      (book.author || '').toLowerCase().includes(normalized) ||
      (book.description || '').toLowerCase().includes(normalized),
  );
}

export function getBookAuthorLabel(book: IBookshelfIntroduce) {
  const author = (book.author || '').trim();
  if (author) {
    return author;
  }

  return (book.description || '').trim();
}

export function getBookDescriptionLabel(book: IBookshelfIntroduce) {
  const description = (book.description || '').trim();
  const author = (book.author || '').trim();

  if (!description) {
    return '';
  }

  if (author && description === author) {
    return '';
  }

  return description;
}

export async function resolveIntroduceCoverUrl(coverImage?: string | null) {
  const normalized = (coverImage || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return (await getS3SignedUrl(normalized)) || normalized;
}
