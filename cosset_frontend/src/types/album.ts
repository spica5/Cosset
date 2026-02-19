import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IAlbumOpenness = (string & {}) | 'Public' | 'Private';

export type IAlbumItem = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  openness: IAlbumOpenness;
  createdAt?: IDateValue;
  updatedAt?: IDateValue;
  totalViews?: number;
  priority?: number;
};

export type IAlbumImage = {
  id: number;
  albumId: number;
  imageTitle?: string;
  fileUrl?: string;
  url?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  bytes?: number;
  position?: number;
  description?: string;
  createdAt?: Date | string;
};