import type { IDateValue } from './common';

export type IGuestAreaItem = {
  id: string;
  customerId?: string;
  title: string;
  motif: string;
  mood: string;
  coverUrl: string;
  images: string[];
  designSpace: string;
  drawer: string;
  createdAt: IDateValue;
};
