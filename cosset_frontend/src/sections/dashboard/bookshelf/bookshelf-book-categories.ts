export type BookshelfBookCategory = 'favorite' | 'important';

export const BOOK_CATEGORY_OPTIONS: Array<{
  value: BookshelfBookCategory;
  label: string;
}> = [
  { value: 'favorite', label: 'Favorite' },
  { value: 'important', label: 'Important' },
];

export const getBookCategoryLabel = (category?: string | null) => {
  const normalized = String(category || '').trim().toLowerCase();

  if (normalized === 'favorite') {
    return 'Favorite';
  }

  if (normalized === 'important') {
    return 'Important';
  }

  return '';
};

export const normalizeBookCategory = (category?: string | null): BookshelfBookCategory | null => {
  const normalized = String(category || '').trim().toLowerCase();

  if (normalized === 'favorite' || normalized === 'important') {
    return normalized;
  }

  return null;
};
