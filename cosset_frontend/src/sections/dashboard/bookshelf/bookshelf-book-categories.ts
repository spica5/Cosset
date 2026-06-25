export const BOOK_GENRE_OPTIONS = [
  { value: 'arts-culture', label: 'Arts & Culture' },
  { value: 'education-reference', label: 'Education & Reference' },
  { value: 'finance-investment', label: 'Finance & Investment' },
  { value: 'health-medicine', label: 'Health & Medicine' },
  { value: 'history', label: 'History' },
  { value: 'lifestyle-hobbies', label: 'Lifestyle & Hobbies' },
  { value: 'literature', label: 'Literature' },
  { value: 'science-technology', label: 'Science & Technology' },
  { value: 'social-sciences-society', label: 'Social Sciences & Society' },
] as const;

export type BookshelfBookGenre = (typeof BOOK_GENRE_OPTIONS)[number]['value'];

export type BookshelfBookFilter = BookshelfBookGenre | 'favorite' | 'borrowed';

export type BookshelfShelfTab = 'all' | 'favorite' | 'borrowed';

/** Genre options for book forms and category pickers. */
export const BOOK_CATEGORY_OPTIONS = BOOK_GENRE_OPTIONS;

export const BOOK_SHELF_FILTER_OPTIONS: Array<{
  value: BookshelfBookFilter;
  label: string;
}> = [
  { value: 'favorite', label: 'Favorite' },
  ...BOOK_GENRE_OPTIONS,
  { value: 'borrowed', label: 'Borrowed' },
];

export function filterBookshelfByShelfTab<
  T extends { isBorrowed?: boolean; isFavorite?: boolean | number | null },
>(items: T[], tab: BookshelfShelfTab) {
  if (tab === 'borrowed') {
    return items.filter((item) => item.isBorrowed);
  }

  if (tab === 'favorite') {
    return items.filter((item) => !item.isBorrowed && isBookFavorite(item.isFavorite));
  }

  return items;
}

export function filterBookshelfByGenre<T extends { category?: string | null }>(
  items: T[],
  genre?: string | null,
) {
  const normalized = String(genre || '').trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter((item) => String(item.category || '').toLowerCase() === normalized);
}

const GENRE_LABEL_BY_VALUE = new Map(
  BOOK_GENRE_OPTIONS.map((option) => [option.value, option.label]),
);

export const getBookCategoryLabel = (category?: string | null) => {
  const normalized = String(category || '').trim().toLowerCase();
  return GENRE_LABEL_BY_VALUE.get(normalized as BookshelfBookGenre) || '';
};

export const normalizeBookCategory = (category?: string | null): BookshelfBookGenre | null => {
  const normalized = String(category || '').trim().toLowerCase();

  if (GENRE_LABEL_BY_VALUE.has(normalized as BookshelfBookGenre)) {
    return normalized as BookshelfBookGenre;
  }

  return null;
};

export const isBookFavorite = (value?: boolean | number | null) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
};

export const normalizeBookFavorite = (value?: boolean | number | null): 0 | 1 =>
  isBookFavorite(value) ? 1 : 0;
