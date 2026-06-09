'use client';

import { useEffect } from 'react';

import Pusher from 'pusher-js';
import { mutate } from 'swr';

import { CONFIG } from 'src/config-global';
import { refreshMailCaches } from 'src/actions/mail';
import { endpoints } from 'src/utils/axios';
import { playChatNotificationSound } from 'src/utils/chat-notification-sound';
import { toast } from 'src/components/dashboard/snackbar';

// ----------------------------------------------------------------------

const USER_MAIL_NEW_EVENT = 'new-mail';

type MailNotificationPayload = {
  mailId?: string;
  subject?: string;
  fromName?: string;
};

function userMailChannel(userId: string) {
  return `user-mail-${userId.trim().toLowerCase()}`;
}

function incrementMailUnreadLabels() {
  return mutate(
    endpoints.mail.labels,
    (current?: { labels: Array<{ id: string; unreadCount?: number }> }) => {
      if (!current?.labels) {
        return current;
      }

      return {
        labels: current.labels.map((label) => {
          if (label.id !== 'inbox' && label.id !== 'all') {
            return label;
          }

          return {
            ...label,
            unreadCount: (label.unreadCount ?? 0) + 1,
          };
        }),
      };
    },
    { revalidate: false },
  );
}

async function refreshNotificationList(customerId: string) {
  await mutate(
    (key) =>
      typeof key === 'string' &&
      key.startsWith(endpoints.notification.list) &&
      key.includes(`customerId=${encodeURIComponent(customerId)}`),
  );
}

export function useMailNotifications(userId?: string) {
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const hasPusher = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);
    if (!hasPusher) {
      return undefined;
    }

    const pusher = new Pusher(CONFIG.pusher.key, {
      cluster: CONFIG.pusher.cluster,
    });

    const channel = pusher.subscribe(userMailChannel(userId));

    const handleNewMail = (payload: MailNotificationPayload) => {
      const fromName = payload?.fromName?.trim() || 'Someone';
      const subject = payload?.subject?.trim() || '(No subject)';

      playChatNotificationSound();
      toast.info(`New email from ${fromName}: ${subject}`);

      incrementMailUnreadLabels();
      refreshNotificationList(userId);
      refreshMailCaches();
    };

    channel.bind(USER_MAIL_NEW_EVENT, handleNewMail);

    return () => {
      channel.unbind(USER_MAIL_NEW_EVENT, handleNewMail);
      pusher.unsubscribe(userMailChannel(userId));
      pusher.disconnect();
    };
  }, [userId]);
}
