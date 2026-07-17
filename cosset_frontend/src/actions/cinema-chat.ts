import type { CinemaChatMessage, CinemaChatParticipant } from 'src/types/cinema-chat';

import axios, { endpoints } from 'src/utils/axios';

export const CINEMA_IDLE_MS = 30 * 60 * 1000;

export const cinemaActivityStorageKey = (ownerCustomerId: string, category: string) =>
  `cinema-last-activity:${ownerCustomerId}:${category}`;

export const CINEMA_ACTIVITY_EVENT = 'cinema-activity';

export const touchCinemaActivity = (ownerCustomerId: string, category: string) => {
  try {
    window.localStorage.setItem(
      cinemaActivityStorageKey(ownerCustomerId, category),
      String(Date.now()),
    );
    window.dispatchEvent(new CustomEvent(CINEMA_ACTIVITY_EVENT));
  } catch {
    // ignore
  }
};

type CinemaChatResponse = {
  messages?: CinemaChatMessage[];
  participants?: CinemaChatParticipant[];
};

export async function fetchCinemaChat(
  ownerCustomerId: string,
  category: string,
): Promise<CinemaChatResponse> {
  const res = await axios.get(endpoints.cinema.chat(ownerCustomerId, category));
  return res.data as CinemaChatResponse;
}

export async function sendCinemaChatMessage(
  ownerCustomerId: string,
  category: string,
  body: { message: string; displayName?: string },
): Promise<{ chatMessage?: CinemaChatMessage }> {
  const res = await axios.post(endpoints.cinema.chat(ownerCustomerId, category), body);
  return res.data as { chatMessage?: CinemaChatMessage };
}

export async function joinCinemaPresence(
  ownerCustomerId: string,
  category: string,
): Promise<{ participant?: CinemaChatParticipant; participants?: CinemaChatParticipant[] }> {
  const res = await axios.post(endpoints.cinema.presence(ownerCustomerId, category));
  return res.data as {
    participant?: CinemaChatParticipant;
    participants?: CinemaChatParticipant[];
  };
}

export async function leaveCinemaPresence(
  ownerCustomerId: string,
  category: string,
): Promise<void> {
  await axios.delete(endpoints.cinema.presence(ownerCustomerId, category));
}

export async function pingCinemaPresence(
  ownerCustomerId: string,
  category: string,
): Promise<void> {
  await axios.put(endpoints.cinema.presence(ownerCustomerId, category));
}

export async function fetchCinemaParticipants(
  ownerCustomerId: string,
  category: string,
): Promise<CinemaChatParticipant[]> {
  const res = await axios.get(endpoints.cinema.presence(ownerCustomerId, category));
  return (res.data?.participants || []) as CinemaChatParticipant[];
}
