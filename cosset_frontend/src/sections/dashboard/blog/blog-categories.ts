// ----------------------------------------------------------------------

export const BLOG_CATEGORY_OPTIONS = [
  { value: 1, label: 'Daily life - Diary' },
  { value: 2, label: 'Personal Point of View' },
  { value: 3, label: 'Personal Growth and Life Journey' },
  { value: 4, label: 'Reflections on Life' },
  { value: 5, label: 'Short moments with vague feelings in everyday' },
  { value: 6, label: 'Thoughts About Love and Relationships' },
  { value: 7, label: 'Life Lessons' },
  { value: 8, label: 'Others' },
] as const;

export function getBlogCategoryLabel(category?: number | null): string {
  if (typeof category !== 'number') {
    return 'N/A';
  }

  const found = BLOG_CATEGORY_OPTIONS.find((option) => option.value === category);

  return found?.label ?? `Category ${category}`;
}
