// ----------------------------------------------------------------------

export type IFriendCard = {
  id: string;
  relationId?: number;
  relationStatus?: 'accepted' | 'pending';
  pendingDirection?: 'incoming' | 'outgoing';
  requestMessage?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  plan?: string;
  country?: string;
  city?: string;
  universeName: string;
  mood: string;
  motif: string;
  role: string;
  coverUrl: string;
  avatarUrl: string;
  connections: number;
  ratingNumber: number;
  openness: string;
};
