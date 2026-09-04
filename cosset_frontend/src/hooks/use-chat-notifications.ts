'use client';

import { mutate } from 'swr';
import Pusher from 'pusher-js';
import { useEffect } from 'react';

import { endpoints } from 'src/utils/axios';
import { playChatNotificationSound } from 'src/utils/chat-notification-sound';

import { CONFIG } from 'src/config-global';
import { revalidateChatUnreadCount, refreshChatCaches } from 'src/actions/chat';

import { toast } from 'src/components/dashboard/snackbar';

// ----------------------------------------------------------------------

const USER_CHAT_NEW_EVENT = 'new-message';

type ChatNotificationPayload = {
  conversationId?: string;
  messageId?: string;
  bodyPreview?: string;
  fromName?: string;
};

function userChatChannel(userId: string) {
  return `user-chat-${userId.trim().toLowerCase()}`;
}

async function refreshNotificationList(customerId: string) {
  await mutate(
    (key) =>
      typeof key === 'string' &&
      key.startsWith(endpoints.notification.list) &&
      key.includes(`customerId=${encodeURIComponent(customerId)}`),
  );
}

export function useChatNotifications(userId?: string) {
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

    const channel = pusher.subscribe(userChatChannel(userId));

    const handleNewMessage = (payload: ChatNotificationPayload) => {
      const fromName = payload?.fromName?.trim() || 'Someone';
      const preview = payload?.bodyPreview?.trim() || 'New message';

      playChatNotificationSound();
      toast.info(`${fromName}: ${preview}`);

      refreshNotificationList(userId);
      revalidateChatUnreadCount();
      refreshChatCaches(payload?.conversationId);
    };

    channel.bind(USER_CHAT_NEW_EVENT, handleNewMessage);

    return () => {
      channel.unbind(USER_CHAT_NEW_EVENT, handleNewMessage);
      pusher.unsubscribe(userChatChannel(userId));

      // Avoid "WebSocket is closed before the connection is established" when
      // React Strict Mode remounts during the Pusher handshake.
      const connection = pusher.connection;
      if (connection.state === 'connecting') {
        const disconnectWhenSettled = () => {
          connection.unbind('connected', disconnectWhenSettled);
          connection.unbind('unavailable', disconnectWhenSettled);
          connection.unbind('failed', disconnectWhenSettled);
          connection.unbind('disconnected', disconnectWhenSettled);
          pusher.disconnect();
        };
        connection.bind('connected', disconnectWhenSettled);
        connection.bind('unavailable', disconnectWhenSettled);
        connection.bind('failed', disconnectWhenSettled);
        connection.bind('disconnected', disconnectWhenSettled);
        return;
      }

      pusher.disconnect();
    };
  }, [userId]);
}
