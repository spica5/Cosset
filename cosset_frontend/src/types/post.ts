import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IPostItem = {
  id: number;
  customerId?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  content?: string | null;
  files?: string | null;
  isPublic?: number | null;
  totalViews?: number | null;
  following?: number | null;
  comments?: string | null;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};

export type IPostCommentItem = {
  id: number;
  targetId: number;
  customerId?: string | null;
  prevCustomer?: string | null;
  targetType: string;
  comment: string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  createdAt?: IDateValue;
};
