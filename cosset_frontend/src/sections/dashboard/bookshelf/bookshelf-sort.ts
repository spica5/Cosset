export const BOOKSHELF_SORT_OPTIONS = [
  { value: 'latest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'author', label: 'Author A-Z' },
  { value: 'author-desc', label: 'Author Z-A' },
  { value: 'order', label: 'Custom order' },
] as const;

export type BookshelfSortValue = (typeof BOOKSHELF_SORT_OPTIONS)[number]['value'];

type SortableBook = {
  title: string;
  author?: string | null;
  order?: number | null;
  createdAt?: string | Date | null;
};

const getCreatedAtTime = (value?: string | Date | null) => {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const compareStrings = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

export function sortBookshelfItems<T extends SortableBook>(
  items: T[],
  sortBy: BookshelfSortValue = 'latest',
): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'oldest':
      return sorted.sort(
        (left, right) => getCreatedAtTime(left.createdAt) - getCreatedAtTime(right.createdAt),
      );
    case 'title':
      return sorted.sort((left, right) => compareStrings(left.title, right.title));
    case 'title-desc':
      return sorted.sort((left, right) => compareStrings(right.title, left.title));
    case 'author':
      return sorted.sort((left, right) => {
        const byAuthor = compareStrings(left.author || '', right.author || '');
        return byAuthor || compareStrings(left.title, right.title);
      });
    case 'author-desc':
      return sorted.sort((left, right) => {
        const byAuthor = compareStrings(right.author || '', left.author || '');
        return byAuthor || compareStrings(left.title, right.title);
      });
    case 'order':
      return sorted.sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return compareStrings(left.title, right.title);
      });
    case 'latest':
    default:
      return sorted.sort(
        (left, right) => getCreatedAtTime(right.createdAt) - getCreatedAtTime(left.createdAt),
      );
  }
}

export function getBookshelfSortLabel(sortBy: BookshelfSortValue) {
  return BOOKSHELF_SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'Newest first';
}
