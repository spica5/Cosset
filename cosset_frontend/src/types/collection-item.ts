import type { IDateValue } from './common';

export type ICollectionDrawerItem = {
  id: number;
  customerId?: string | null;
  collectionId: number;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  isPublic?: number | null;
  date?: IDateValue;
  images?: string | null;
  videos?: string | null;
  files?: string | null;
  totalViews?: number | null;
  updatedAt?: IDateValue;
};
