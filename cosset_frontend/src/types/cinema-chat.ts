export type CinemaChatMessage = {
  id: string;
  ownerCustomerId: string;
  category: string;
  text: string;
  authorName: string;
  authorAvatar?: string | null;
  userId: string | null;
  sentAt: string;
  chatMode?: 'public';
  kind?: 'text' | 'system';
  messageType?: 'text' | 'file';
};

export type CinemaChatParticipant = {
  userId: string;
  name: string;
  photoURL: string | null;
  leftAt?: string;
  joinedAt?: string;
};

export const CINEMA_CHAT_EVENT = 'new-message';
export const CINEMA_PARTICIPANT_JOINED_EVENT = 'participant-joined';
export const CINEMA_PARTICIPANT_LEFT_EVENT = 'participant-left';

export function cinemaChatChannelName(ownerCustomerId: string, category: string) {
  const owner = String(ownerCustomerId || '').trim().toLowerCase();
  const cat = String(category || '').trim().toLowerCase();
  return `cinema-${owner}-${cat}`;
}
