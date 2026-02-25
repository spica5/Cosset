import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IGiftItem = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  receivedDate: IDateValue;
  receivedFrom: string;
  images: string;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};