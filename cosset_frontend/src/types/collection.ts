import type { IDateValue } from './common';

export type ICollectionItem = {
  id: number;
  customerId?: string | null;
  name: string;
  description?: string | null;
  category?: number | null;
  reference?: string | null;
  order?: number | null;
  totalViews?: number | null;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};
