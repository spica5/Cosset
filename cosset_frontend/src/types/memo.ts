import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IMemoItem = {
  id: number;
  customerId: string;
  /** 1 = Good Memo, 2 = Sad Memo */
  collectionId: 1 | 2;
  title: string;
  description?: string | null;
  date?: IDateValue;
  isPublic: 0 | 1;
  images?: string | null;
  totalViews?: number | null;
  updatedAt?: IDateValue;
};
