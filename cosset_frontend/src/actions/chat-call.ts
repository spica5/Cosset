import type {
  ChatCallMediaType,
  ChatCallSession,
  ChatCallSignalPayload,
} from 'src/types/chat-call';

import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export async function inviteChatCall(input: {
  conversationId: string;
  calleeId: string;
  mediaType: ChatCallMediaType;
}) {
  const res = await axios.post(endpoints.chatCalls.root, input);
  return res.data?.call as ChatCallSession;
}

export async function acceptChatCall(callId: string) {
  const res = await axios.post(endpoints.chatCalls.action(callId), { action: 'accept' });
  return res.data?.call as ChatCallSession;
}

export async function rejectChatCall(callId: string) {
  const res = await axios.post(endpoints.chatCalls.action(callId), { action: 'reject' });
  return res.data?.call as ChatCallSession;
}

export async function endChatCall(callId: string, action: 'end' | 'cancel' | 'miss' = 'end') {
  const res = await axios.post(endpoints.chatCalls.action(callId), { action });
  return res.data?.call as ChatCallSession;
}

export async function signalChatCall(
  callId: string,
  payload: Omit<ChatCallSignalPayload, 'callId' | 'conversationId' | 'fromUserId'> & {
    conversationId?: string;
  },
) {
  const res = await axios.post(endpoints.chatCalls.action(callId), {
    action: 'signal',
    type: payload.type,
    sdp: payload.sdp ?? null,
    candidate: payload.candidate ?? null,
  });
  return res.data;
}

export async function fetchChatCallIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await axios.get(endpoints.chatCalls.ice);
    const servers = res.data?.iceServers;
    if (Array.isArray(servers) && servers.length) {
      return servers as RTCIceServer[];
    }
  } catch {
    // fall through to public STUN
  }

  return [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
}
