import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IUniverseOpenness = (string & {}) | 'Private' | 'Shared' | 'Invite-Only' | 'Open';

export type IUniverseProps = {
  id: string;
  name: string;
  heroUrl: string;
  coverUrl: string;
  mood: string;
  motif: string;
  duration: string;
  connections: number;
  gallery: string[];
  favorited: boolean;
  description: string;
  ratingNumber: number;
  totalReviews: number;
  highlights: string[];
  createdAt: IDateValue;
  openness: IUniverseOpenness;
  available: {
    start: IDateValue;
    end: IDateValue;
  };
  program: {
    label: string;
    text: string;
  }[];
};
