import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

import type { NotificationItemProps } from 'src/layouts/dashboard/components/notifications-drawer/notification-item';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const NOTIFICATION_LIST_LIMIT = 50;
const NOTIFICATION_LIST_OFFSET = 0;

const buildNotificationListUrl = (customerId?: string) => {
  const params = new URLSearchParams({
    limit: String(NOTIFICATION_LIST_LIMIT),
    offset: String(NOTIFICATION_LIST_OFFSET),
  });

  if (customerId) {
    params.set('customerId', customerId);
  }

  return `${endpoints.notification.list}?${params.toString()}`;
};

const revalidateNotificationCaches = async (customerId?: string, notificationId?: string | number) => {
  await mutate(buildNotificationListUrl(customerId));

  if (notificationId !== undefined) {
    await mutate(endpoints.notification.details(notificationId));
  }
};

type NotificationsData = {
  notifications: Array<{
    id: number;
    customerId: string;
    avatarUrl: string | null;
    type: number;
    category: number;
    isUnRead: boolean;
    isArchived: boolean;
    title: string | null;
    content: string | null;
    createdAt: string | number | null;
  }>;
};

const TYPE_LABEL: Record<number, string> = {
  1: 'friend',
  2: 'project',
  3: 'file',
  4: 'tags',
  5: 'payment',
  6: 'order',
  7: 'chat',
  8: 'mail',
  9: 'delivery',
};

const CATEGORY_LABEL: Record<number, string> = {
  1: 'Communication',
  2: 'Project UI',
  3: 'File manager',
  4: 'Order',
  5: 'System',
};

export function useGetNotifications(customerId?: string) {
  const url = buildNotificationListUrl(customerId);

  const { data, isLoading, error, isValidating } = useSWR<NotificationsData>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      notifications:
        data?.notifications.map((item) => ({
          id: String(item.id),
          type: TYPE_LABEL[item.type] || 'mail',
          title: item.title || (item.content ? `<p>${item.content}</p>` : '<p>Notification</p>'),
          category: CATEGORY_LABEL[item.category] || 'System',
          isUnRead: item.isUnRead,
          archived: item.isArchived,
          avatarUrl: item.avatarUrl,
          createdAt: item.createdAt,
        })) || [],
      notificationsLoading: isLoading,
      notificationsError: error,
      notificationsValidating: isValidating,
      notificationsEmpty: !isLoading && !data?.notifications.length,
    }),
    [data?.notifications, error, isLoading, isValidating]
  );

  return memoizedValue;
}

type CreateNotificationInput = {
  customerId: string;
  avatarUrl?: string | null;
  type: number;
  category: number;
  isUnRead: boolean;
  isArchived?: boolean;
  title?: string | null;
  content?: string | null;
};

export async function createNotification(notification: CreateNotificationInput) {
  const res = await axiosInstance.post(endpoints.notification.new, {
    notification: {
      ...notification,
      isArchived: notification.isArchived ?? false,
    },
  });

  await revalidateNotificationCaches(notification.customerId);

  return res.data;
}

type UpdateNotificationInput = {
  customerId?: string;
  avatarUrl?: string | null;
  type?: number;
  category?: number;
  isUnRead?: boolean;
  isArchived?: boolean;
  title?: string | null;
  content?: string | null;
};

export async function updateNotification(
  notificationId: string | number,
  updates: UpdateNotificationInput,
  customerId?: string,
) {
  const res = await axiosInstance.put(endpoints.notification.details(notificationId), { updates });

  await revalidateNotificationCaches(customerId, notificationId);

  return res.data;
}

export async function markNotificationAsRead(notificationId: string | number, customerId?: string) {
  return updateNotification(notificationId, { isUnRead: false }, customerId);
}

export async function archiveNotification(notificationId: string | number, customerId?: string) {
  return updateNotification(notificationId, { isUnRead: false, isArchived: true }, customerId);
}

export async function deleteNotification(notificationId: string | number, customerId?: string) {
  const res = await axiosInstance.delete(endpoints.notification.details(notificationId));

  await mutate(buildNotificationListUrl(customerId));
  await mutate(endpoints.notification.details(notificationId), undefined, { revalidate: false });

  return res.data;
}

export async function deleteAllNotifications(
  notificationIds: Array<string | number>,
  customerId?: string,
) {
  const uniqueIds = Array.from(new Set(notificationIds.map(String)));

  if (uniqueIds.length === 0) {
    return { deletedIds: [] as string[] };
  }

  await Promise.all(
    uniqueIds.map((notificationId) => axiosInstance.delete(endpoints.notification.details(notificationId))),
  );

  await mutate(buildNotificationListUrl(customerId));

  await Promise.all(
    uniqueIds.map((notificationId) =>
      mutate(endpoints.notification.details(notificationId), undefined, { revalidate: false }),
    ),
  );

  return { deletedIds: uniqueIds };
}

export async function markAllNotificationsAsRead(
  notificationIds: Array<string | number>,
  customerId?: string,
) {
  const uniqueIds = Array.from(new Set(notificationIds.map(String)));

  await Promise.all(
    uniqueIds.map((notificationId) =>
      axiosInstance.put(endpoints.notification.details(notificationId), {
        updates: { isUnRead: false },
      }),
    ),
  );

  await revalidateNotificationCaches(customerId);

  return { updatedIds: uniqueIds };
}
