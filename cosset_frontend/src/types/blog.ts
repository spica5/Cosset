import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IBlogItem = {
  id: number;
  customerId?: string | null;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  content?: string | null;
  file?: string | null;
  isPublic?: number | null;
  totalViews?: number | null;
  following?: number | null;
  comments?: string | null;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};
