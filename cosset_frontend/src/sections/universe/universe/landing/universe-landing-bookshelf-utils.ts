import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

// ----------------------------------------------------------------------

export type BookshelfItem =
  | { kind: 'ebook'; item: IBookshelfEbook }
  | { kind: 'audiobook'; item: IBookshelfAudiobook };

export const SHELF_COUNT = 3;
export const BOOKS_PER_SHELF = 8;

export const BOOKSHELF_GRID_COLUMNS = {
  xs: 3,
  sm: 4,
  md: 5,
  lg: BOOKS_PER_SHELF,
} as const;

export const BOOKSHELF_GRID_TEMPLATE_COLUMNS = {
  xs: `repeat(${BOOKSHELF_GRID_COLUMNS.xs}, minmax(0, 1fr))`,
  sm: `repeat(${BOOKSHELF_GRID_COLUMNS.sm}, minmax(0, 1fr))`,
  md: `repeat(${BOOKSHELF_GRID_COLUMNS.md}, minmax(0, 1fr))`,
  lg: `repeat(${BOOKSHELF_GRID_COLUMNS.lg}, minmax(0, 1fr))`,
};

/** Narrower shelf area when the detail panel sits beside the grid (xl+). */
export const BOOKSHELF_GRID_COLUMNS_COMPACT = {
  xs: 2,
  sm: 3,
  md: 5,
  lg: 6,
  xl: 8,
} as const;

export const BOOKSHELF_GRID_TEMPLATE_COLUMNS_COMPACT = {
  xs: `repeat(${BOOKSHELF_GRID_COLUMNS_COMPACT.xs}, minmax(0, 1fr))`,
  sm: `repeat(${BOOKSHELF_GRID_COLUMNS_COMPACT.sm}, minmax(0, 1fr))`,
  md: `repeat(${BOOKSHELF_GRID_COLUMNS_COMPACT.md}, minmax(0, 1fr))`,
  lg: `repeat(${BOOKSHELF_GRID_COLUMNS_COMPACT.lg}, minmax(0, 1fr))`,
  xl: `repeat(${BOOKSHELF_GRID_COLUMNS_COMPACT.xl}, minmax(0, 1fr))`,
};

export function padShelfEntries(
  entries: BookshelfItem[],
  slotCount: number = BOOKS_PER_SHELF,
): Array<BookshelfItem | null> {
  const padded: Array<BookshelfItem | null> = entries.slice(0, slotCount);

  while (padded.length < slotCount) {
    padded.push(null);
  }

  return padded;
}

export function getEntryKey(entry: BookshelfItem) {
  return `${entry.kind}-${entry.item.id}`;
}

export function getEntryTitle(entry: BookshelfItem) {
  return (entry.item.title || '').trim() || `Book #${entry.item.id}`;
}

export function filterBookshelfItems(items: BookshelfItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter(({ item, kind }) => {
    const searchable = [
      item.title,
      item.author,
      item.publishYear != null ? String(item.publishYear) : '',
      item.description,
      kind === 'ebook' ? 'e-book' : 'audio-book',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalized);
  });
}

export function splitEntriesIntoShelves(items: BookshelfItem[]) {
  const shelves: BookshelfItem[][] = [];

  items.forEach((entry, index) => {
    const shelfIndex = Math.floor(index / BOOKS_PER_SHELF);

    if (!shelves[shelfIndex]) {
      shelves[shelfIndex] = [];
    }

    if (shelves[shelfIndex].length < BOOKS_PER_SHELF) {
      shelves[shelfIndex].push(entry);
    }
  });

  return shelves;
}
