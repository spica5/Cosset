export const BOOK_GENRE_VALUES = [
  'arts-culture',
  'education-reference',
  'finance-investment',
  'health-medicine',
  'history',
  'lifestyle-hobbies',
  'literature',
  'science-technology',
  'social-sciences-society',
] as const;

export type BookshelfBookGenre = (typeof BOOK_GENRE_VALUES)[number];

const GENRE_SET = new Set<string>(BOOK_GENRE_VALUES);

export const normalizeBookGenre = (value: unknown): BookshelfBookGenre | null => {
  const normalized = String(value || '').trim().toLowerCase();

  if (GENRE_SET.has(normalized)) {
    return normalized as BookshelfBookGenre;
  }

  return null;
};
