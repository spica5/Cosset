export type CoffeeShopChatMessage = {
  id: string;
  coffeeShopId: number;
  text: string;
  authorName: string;
  /** Profile photo URL or S3 key (resolved on the client when not http(s)). */
  authorAvatar?: string | null;
  userId: string | null;
  sentAt: string;
  /** `system` = enter/leave announcements (not stored in chat logs). */
  kind?: 'text' | 'system';
};

export type CoffeeShopChatParticipant = {
  userId: string;
  name: string;
  photoURL: string | null;
};

export const COFFEE_SHOP_CHAT_EVENT = 'new-message';
export const COFFEE_SHOP_PARTICIPANT_JOINED_EVENT = 'participant-joined';
export const COFFEE_SHOP_PARTICIPANT_LEFT_EVENT = 'participant-left';
