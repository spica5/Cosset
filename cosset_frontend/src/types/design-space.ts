import type { IDateValue } from './common';

export type IDesignSpaceItem = {
  id: string;
  background: string; // JSON stringified array of S3 image keys
  rooms: string;
  effects: string;
  createdAt: IDateValue;
};
