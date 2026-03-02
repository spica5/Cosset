import useSWR from 'swr';
import { useMemo } from 'react';

import axiosInstance, { fetcher, endpoints } from 'src/utils/axios';

import type { NotificationItemProps } from 'src/layouts/dashboard/components/notifications-drawer/notification-item';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type NotificationsData = {
  notifications: Array<{
    id: number;
    customerId: string;
    avatarUrl: string | null;
    type: number;
    category: number;
    isUnRead: boolean;
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
  const url = customerId
    ? [endpoints.notification.list, { params: { customerId, limit: 50, offset: 0 } }]
    : [endpoints.notification.list, { params: { limit: 50, offset: 0 } }];

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
  title?: string | null;
  content?: string | null;
};

export async function createNotification(notification: CreateNotificationInput) {
  const res = await axiosInstance.post(endpoints.notification.new, { notification });
  return res.data;
}
