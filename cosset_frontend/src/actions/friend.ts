import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

type FriendStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'blocked';

export type IUserFriendRelation = {
  id: number;
  userId1: string;
  userId2: string;
  pairUserLow: string;
  pairUserHigh: string;
  status: FriendStatus;
  requestedAt: string;
  respondedAt: string | null;
};

type FriendsApiResponse = {
  friends: IUserFriendRelation[];
};

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const buildFriendsUrl = (
  userId?: string,
  status: FriendStatus = 'accepted',
  limit: number = 2000,
  offset: number = 0
) => {
  const normalizedUserId = (userId || '').trim();

  const params = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  if (normalizedUserId) {
    params.set('userId', normalizedUserId);
  }

  return `${endpoints.friend.list}?${params.toString()}`;
};

const revalidateFriendCaches = async (userId?: string) => {
  await Promise.all([
    mutate(buildFriendsUrl(userId, 'accepted')),
    mutate(buildFriendsUrl(userId, 'pending')),
    mutate(buildFriendsUrl(userId, 'rejected')),
    mutate(buildFriendsUrl(userId, 'cancelled')),
    mutate(buildFriendsUrl(undefined, 'accepted')),
  ]);
};

// ----------------------------------------------------------------------

export function useGetFriends(
  userId?: string,
  status: FriendStatus = 'accepted',
  enabled: boolean = true
) {
  const url = enabled ? buildFriendsUrl(userId, status) : null;

  const { data, isLoading, error, isValidating } = useSWR<FriendsApiResponse>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      friends: data?.friends || [],
      friendsLoading: isLoading,
      friendsError: error,
      friendsValidating: isValidating,
      friendsEmpty: !isLoading && !data?.friends?.length,
    }),
    [data?.friends, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export async function requestFriend(userId1: string, userId2: string) {
  const res = await axiosInstance.post(endpoints.friend.new, {
    userId1,
    userId2,
  });

  await revalidateFriendCaches(userId1);

  return res.data;
}

export async function updateFriendStatus(
  friendId: number,
  actorUserId: string,
  status: 'accepted' | 'rejected' | 'cancelled' | 'blocked'
) {
  const res = await axiosInstance.patch(endpoints.friend.details(friendId), {
    actorUserId,
    status,
  });

  await revalidateFriendCaches(actorUserId);

  return res.data;
}

export async function acceptFriendRequest(friendId: number, actorUserId: string) {
  return updateFriendStatus(friendId, actorUserId, 'accepted');
}

export async function rejectFriendRequest(friendId: number, actorUserId: string) {
  return updateFriendStatus(friendId, actorUserId, 'rejected');
}

export async function cancelFriendRequest(friendId: number, actorUserId: string) {
  return updateFriendStatus(friendId, actorUserId, 'cancelled');
}

export async function removeFriend(friendId: number, userId: string) {
  const res = await axiosInstance.delete(`${endpoints.friend.details(friendId)}?userId=${userId}`);

  await revalidateFriendCaches(userId);

  return res.data;
}

export async function acceptFriendInviteLink(inviterUserId: string, inviteeEmail: string) {
  const res = await axiosInstance.post(endpoints.friend.inviteAccept, {
    inviterUserId,
    inviteeEmail,
  });

  return res.data;
}
