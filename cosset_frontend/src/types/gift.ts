import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IGiftOpenness = (string & {}) | 'Public' | 'Private';

export type IGiftItem = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  receivedDate: IDateValue;
  receivedFrom: string;
  images: string;
  openness: IGiftOpenness;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};