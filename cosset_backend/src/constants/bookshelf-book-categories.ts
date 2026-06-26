export const BOOK_GENRE_VALUES = [
  'Literature',
  'Mystery, Crime & Horror',
  'Science Fiction & Technology',
  'History, Geography & Travel',
  'Business & Finance',
  'Self-Improvement & Psychology',
  'Philosophy & Religion',
  'Health & Wellness',
  'Children\'s Books',
  'Education & Learning',
  'Cooking & Food',
  'Arts & Design',
  'Politics & Society',
  'Biographies & Memoirs',
  'Journalism & Essays',
  'Humor & Entertainment',
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
