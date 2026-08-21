export type ChatCallMediaType = 'audio' | 'video';

export type ChatCallStatus =
  | 'ringing'
  | 'active'
  | 'ended'
  | 'rejected'
  | 'missed'
  | 'cancelled';

export type ChatCallPeer = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type ChatCallSession = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mediaType: ChatCallMediaType;
  status: ChatCallStatus;
  createdAt?: string | Date | null;
  answeredAt?: string | Date | null;
  endedAt?: string | Date | null;
  peer: ChatCallPeer;
  callerName?: string;
  callerAvatarUrl?: string;
  calleeName?: string;
  calleeAvatarUrl?: string;
};

export type ChatCallHistoryPayload = {
  callId: string;
  mediaType: ChatCallMediaType;
  status: ChatCallStatus;
  durationSec?: number | null;
  endedReason?: string | null;
};

export type ChatCallSignalPayload = {
  callId: string;
  conversationId: string;
  fromUserId: string;
  type: 'offer' | 'answer' | 'ice';
  sdp?: RTCSessionDescriptionInit | null;
  candidate?: RTCIceCandidateInit | null;
};
