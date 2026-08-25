import type { IDocumentationDocument } from 'src/types/documentation';

export const DOCUMENTATION_SORT_OPTIONS = [
  { value: 'latest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'size-desc', label: 'Largest first' },
  { value: 'size', label: 'Smallest first' },
  { value: 'type', label: 'File type A-Z' },
  { value: 'order', label: 'Custom order' },
] as const;

export type DocumentationSortValue = (typeof DOCUMENTATION_SORT_OPTIONS)[number]['value'];

const getCreatedAtTime = (value?: string | Date | null) => {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const compareStrings = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

export function sortDocumentationDocuments(
  items: IDocumentationDocument[],
  sortBy: DocumentationSortValue = 'latest',
): IDocumentationDocument[] {
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
    case 'size-desc':
      return sorted.sort((left, right) => {
        const bySize = (Number(right.fileSizeBytes) || 0) - (Number(left.fileSizeBytes) || 0);
        return bySize || compareStrings(left.title, right.title);
      });
    case 'size':
      return sorted.sort((left, right) => {
        const bySize = (Number(left.fileSizeBytes) || 0) - (Number(right.fileSizeBytes) || 0);
        return bySize || compareStrings(left.title, right.title);
      });
    case 'type':
      return sorted.sort((left, right) => {
        const byType = compareStrings(left.fileType || '', right.fileType || '');
        return byType || compareStrings(left.title, right.title);
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

export function getDocumentationSortLabel(sortBy: DocumentationSortValue) {
  return DOCUMENTATION_SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'Newest first';
}
