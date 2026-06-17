import type { CoffeeShopChatMessage, CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';
import type { CoffeeShopMenuOrderBody } from 'src/types/coffee-shop-menu';
import type { CoffeeShopMenuItem } from 'src/utils/coffee-shop-menu';
import type { ICoffeeShopItem } from 'src/types/coffee-shop';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const COFFEE_SHOP_LIST_ENDPOINT = endpoints.coffeeShop.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export const revalidateCoffeeShopList = async () => {
  try {
    await mutate(COFFEE_SHOP_LIST_ENDPOINT, undefined, { revalidate: true });
  } catch {
    // Ignore cache refresh failures; CRUD already succeeded on the server.
  }
};

const revalidateCoffeeShopDetail = async (id: string | number) => {
  try {
    await mutate(endpoints.coffeeShop.details(id), undefined, { revalidate: true });
  } catch {
    // Ignore cache refresh failures; CRUD already succeeded on the server.
  }
};

type CoffeeShopsData = {
  coffeeShops?: ICoffeeShopItem[];
};

type CoffeeShopData = {
  coffeeShop?: ICoffeeShopItem;
};

export function useGetCoffeeShops() {
  const { data, isLoading, error, isValidating } = useSWR<CoffeeShopsData>(
    COFFEE_SHOP_LIST_ENDPOINT,
    fetcher,
    swrOptions,
  );

  return useMemo(
    () => ({
      coffeeShops: data?.coffeeShops || [],
      coffeeShopsLoading: isLoading,
      coffeeShopsError: error,
      coffeeShopsValidating: isValidating,
      coffeeShopsEmpty: !isLoading && !(data?.coffeeShops || []).length,
    }),
    [data?.coffeeShops, error, isLoading, isValidating],
  );
}

export function useGetCoffeeShop(id: string | number | '') {
  const url = id ? endpoints.coffeeShop.details(id) : null;
  const { data, isLoading, error, isValidating } = useSWR<CoffeeShopData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      coffeeShop: data?.coffeeShop,
      coffeeShopLoading: isLoading,
      coffeeShopError: error,
      coffeeShopValidating: isValidating,
    }),
    [data?.coffeeShop, error, isLoading, isValidating],
  );
}

export async function createCoffeeShop(
  coffeeShop: Omit<ICoffeeShopItem, 'id' | 'createdAt'>,
) {
  const res = await axios.post(endpoints.coffeeShop.add, { coffeeShop });

  await revalidateCoffeeShopList();

  return res.data;
}

export async function updateCoffeeShop(id: string | number, updates: Partial<ICoffeeShopItem>) {
  const res = await axios.put(endpoints.coffeeShop.update(id), { updates });

  await Promise.all([revalidateCoffeeShopList(), revalidateCoffeeShopDetail(id)]);

  return res.data;
}

export async function deleteCoffeeShop(id: string | number) {
  const res = await axios.delete(endpoints.coffeeShop.delete(id));

  await revalidateCoffeeShopList();

  return res.data;
}

type SendCoffeeShopChatBody = {
  message: string;
  displayName?: string;
  chatMode?: 'public' | 'friend' | 'private';
  receiverId?: string | null;
  messageType?: 'text' | 'file';
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

type SendCoffeeShopChatResponse = {
  chatMessage?: CoffeeShopChatMessage;
};

export async function sendCoffeeShopChatMessage(
  coffeeShopId: string | number,
  body: SendCoffeeShopChatBody,
): Promise<SendCoffeeShopChatResponse> {
  const res = await axios.post(endpoints.coffeeShop.chat(coffeeShopId), body);
  return res.data as SendCoffeeShopChatResponse;
}

export async function deleteCoffeeShopChatMessage(
  coffeeShopId: string | number,
  messageId: string | number,
): Promise<{ message?: string; id?: string }> {
  const res = await axios.delete(endpoints.coffeeShop.chatMessage(coffeeShopId, messageId));
  return res.data as { message?: string; id?: string };
}

type CoffeeShopChatTodayResponse = {
  messages?: CoffeeShopChatMessage[];
  participants?: CoffeeShopChatParticipant[];
};

export async function fetchCoffeeShopChatToday(
  coffeeShopId: string | number,
): Promise<CoffeeShopChatTodayResponse> {
  const res = await axios.get(endpoints.coffeeShop.chat(coffeeShopId));
  return res.data as CoffeeShopChatTodayResponse;
}

export const COFFEE_SHOP_IDLE_MS = 30 * 60 * 1000;

export const coffeeShopActivityStorageKey = (coffeeShopId: string | number) =>
  `coffee-shop-last-activity:${coffeeShopId}`;

export const COFFEE_SHOP_ACTIVITY_EVENT = 'coffee-shop-activity';

export const touchCoffeeShopActivity = (coffeeShopId: string | number) => {
  try {
    window.localStorage.setItem(coffeeShopActivityStorageKey(coffeeShopId), String(Date.now()));
    window.dispatchEvent(new CustomEvent(COFFEE_SHOP_ACTIVITY_EVENT));
  } catch {
    // ignore
  }
};

type CoffeeShopPresenceResponse = {
  participant?: CoffeeShopChatParticipant;
};

export async function joinCoffeeShopPresence(
  coffeeShopId: string | number,
): Promise<CoffeeShopPresenceResponse> {
  const res = await axios.post(endpoints.coffeeShop.presence(coffeeShopId));
  return res.data as CoffeeShopPresenceResponse;
}

export async function leaveCoffeeShopPresence(coffeeShopId: string | number): Promise<void> {
  await axios.delete(endpoints.coffeeShop.presence(coffeeShopId));
}

export async function pingCoffeeShopPresence(coffeeShopId: string | number): Promise<void> {
  await axios.put(endpoints.coffeeShop.presence(coffeeShopId));
}

type SetCoffeeShopPresenceHiddenResponse = {
  isHidden?: boolean;
};

export async function setCoffeeShopPresenceHidden(
  coffeeShopId: string | number,
  isHidden: boolean,
): Promise<SetCoffeeShopPresenceHiddenResponse> {
  const res = await axios.patch(endpoints.coffeeShop.presence(coffeeShopId), { isHidden });
  return res.data as SetCoffeeShopPresenceHiddenResponse;
}

export async function fetchMyCoffeeShopPresence(): Promise<{ coffeeShopId?: number | null }> {
  const res = await axios.get(endpoints.coffeeShop.presenceMe);
  return res.data as { coffeeShopId?: number | null };
}

type CoffeeShopMenuResponse = {
  items?: CoffeeShopMenuItem[];
};

export async function fetchCoffeeShopMenu(
  coffeeShopId: string | number,
): Promise<CoffeeShopMenuResponse> {
  const res = await axios.get(endpoints.coffeeShop.menu(coffeeShopId));
  return res.data as CoffeeShopMenuResponse;
}

type CoffeeShopOrderResponse = {
  message?: string;
  menuItem?: CoffeeShopMenuItem;
};

export async function placeCoffeeShopOrder(
  coffeeShopId: string | number,
  body: CoffeeShopMenuOrderBody & { displayName?: string },
): Promise<CoffeeShopOrderResponse> {
  const res = await axios.post(endpoints.coffeeShop.menuOrder(coffeeShopId), body);
  return res.data as CoffeeShopOrderResponse;
}
