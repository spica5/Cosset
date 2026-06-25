import type { DesignSpaceType } from 'src/utils/design-space-type';

import type { IDateValue } from './common';

export type IDesignSpaceItem = {
  id: string;
  background: string; // JSON stringified array of S3 image keys
  rooms: string;
  effects: string;
  designType: DesignSpaceType;
  createdAt: IDateValue;
};
