import type { IDateValue } from './common';

export type INeighborFriend = {
  id: string;
  name: string;
  friends: number;
  avatarUrl: string;
};

export type INeighborItem = {
  id: string;
  name: string;
  universeName: string;
  mood: string;
  motif: string;
  openness: string;
  friends: INeighborFriend[];
  totalViews: number;
  content: string;
  publish: string;
  images: string[];
  ratingNumber: number;
  createdAt: IDateValue;
  available: {
    startDate: IDateValue;
    endDate: IDateValue;
  };
};
