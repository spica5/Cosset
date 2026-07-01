import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

// ----------------------------------------------------------------------

export type BookshelfItem =
  | { kind: 'ebook'; item: IBookshelfEbook }
  | { kind: 'audiobook'; item: IBookshelfAudiobook };

export const SHELF_COUNT = 3;
export const BOOKS_PER_SHELF = 6;

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
  const shelves: BookshelfItem[][] = Array.from({ length: SHELF_COUNT }, () => []);

  items.forEach((entry, index) => {
    const shelfIndex = Math.min(Math.floor(index / BOOKS_PER_SHELF), SHELF_COUNT - 1);

    if (shelves[shelfIndex].length < BOOKS_PER_SHELF) {
      shelves[shelfIndex].push(entry);
    }
  });

  return shelves;
}
