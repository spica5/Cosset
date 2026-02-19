import type { IDateValue } from './common';

export type IGuestAreaItem = {
  id: string;
  title: string;
  motif: string;
  mood: string;
  coverUrl: string;
  images: string[];
  createdAt: IDateValue;
};
