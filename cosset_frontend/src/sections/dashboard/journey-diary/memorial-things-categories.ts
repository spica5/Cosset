import type { JourneyMemorialThingCategory } from 'src/types/journey-diary-memorial-thing';

// ----------------------------------------------------------------------

export type MemorialThingCategoryOption = {
  value: JourneyMemorialThingCategory;
  label: string;
  icon: string;
};

export const MEMORIAL_THING_CATEGORIES: MemorialThingCategoryOption[] = [
  { value: 'scenery', label: 'Scenery', icon: 'solar:mountains-bold-duotone' },
  { value: 'food', label: 'Food', icon: 'solar:cup-hot-bold-duotone' },
  { value: 'culture', label: 'Culture', icon: 'solar:buildings-2-bold-duotone' },
  { value: 'people', label: 'People', icon: 'solar:users-group-rounded-bold-duotone' },
  { value: 'special_events', label: 'Special Events', icon: 'solar:star-bold-duotone' },
];

export const getMemorialThingCategoryLabel = (category: JourneyMemorialThingCategory) =>
  MEMORIAL_THING_CATEGORIES.find((item) => item.value === category)?.label || category;

export const getMemorialThingCategoryIcon = (category: JourneyMemorialThingCategory) =>
  MEMORIAL_THING_CATEGORIES.find((item) => item.value === category)?.icon || 'solar:bookmark-bold';
