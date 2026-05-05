import type { IDateValue } from './common';

export type ILetterItem = {
  id: number;
  customerId: string;
  collectionId: 4;
  title: string;
  description?: string | null;
  date?: IDateValue;
  isPublic: 0 | 1;
  images?: string | null;
  totalViews?: number | null;
  updatedAt?: IDateValue;
};