import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IGiftOpenness = (string & {}) | 'Public' | 'Private';

export type IGiftItem = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  eventAt: IDateValue;
  sendTo?: string;
  receivedFrom: string;
  images: string;
  openness: IGiftOpenness;
  totalViews?: number | null;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
};