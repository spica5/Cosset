import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

const NOTIFICATION_LIST_LIMIT = 50;
const NOTIFICATION_LIST_OFFSET = 0;

/** CRM inbox shows customer + payment related messages only. */
export const CRM_NOTIFICATION_TYPE_IDS = new Set([5, 10, 13]);

const TYPE_LABEL: Record<number, string> = {
  5: 'payment',
  10: 'customer',
  13: 'customer',
};

const CATEGORY_LABEL: Record<number, string> = {
  4: 'Payment',
  5: 'Customer',
};

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

const revalidateNotificationCaches = async (
  customerId?: string,
  notificationId?: string | number,
) => {
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

export type CrmNotificationItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  isUnRead: boolean;
  archived: boolean;
  avatarUrl: string | null;
  createdAt: string | number | null;
};

function toCrmNotificationItem(
  item: NotificationsData['notifications'][number],
): CrmNotificationItem {
  const titleHtml =
    item.title && item.content
      ? `<p><strong>${item.title}</strong> ${item.content}</p>`
      : item.title
        ? `<p><strong>${item.title}</strong></p>`
        : item.content
          ? `<p>${item.content}</p>`
          : '<p>Notification</p>';

  return {
    id: String(item.id),
    type: TYPE_LABEL[item.type] || 'customer',
    title: titleHtml,
    category: CATEGORY_LABEL[item.category] || (item.type === 5 ? 'Payment' : 'Customer'),
    isUnRead: item.isUnRead,
    archived: item.isArchived,
    avatarUrl: item.avatarUrl,
    createdAt: item.createdAt,
  };
}

export function useGetCrmNotifications(customerId?: string) {
  const url = customerId ? buildNotificationListUrl(customerId) : null;

  const { data, isLoading, error, isValidating } = useSWR<NotificationsData>(
    url,
    fetcher,
    swrOptions,
  );

  const memoizedValue = useMemo(() => {
    const notifications =
      data?.notifications
        .filter((item) => CRM_NOTIFICATION_TYPE_IDS.has(item.type))
        .map(toCrmNotificationItem) || [];

    return {
      notifications,
      notificationsLoading: isLoading,
      notificationsError: error,
      notificationsValidating: isValidating,
      notificationsEmpty: !isLoading && !notifications.length,
    };
  }, [data?.notifications, error, isLoading, isValidating]);

  return memoizedValue;
}

type UpdateNotificationInput = {
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

  if (!uniqueIds.length) {
    return { deletedIds: [] as string[] };
  }

  await Promise.all(
    uniqueIds.map((notificationId) =>
      axiosInstance.delete(endpoints.notification.details(notificationId)),
    ),
  );

  await mutate(buildNotificationListUrl(customerId));

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
