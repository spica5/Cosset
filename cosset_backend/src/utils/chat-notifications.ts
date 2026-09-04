import { createNotification } from 'src/models/notifications';
import { sendWebPushToUser } from 'src/utils/web-push';
import { getPusherServer, userChatChannel, USER_CHAT_NEW_EVENT } from 'src/utils/pusher';

// ----------------------------------------------------------------------

type NotifyChatMessageReceivedParams = {
  recipientId: string;
  conversationId: string;
  messageId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  bodyPreview: string;
};

const previewText = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New message';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

export async function notifyChatMessageReceived({
  recipientId,
  conversationId,
  messageId,
  senderName,
  senderAvatarUrl,
  bodyPreview,
}: NotifyChatMessageReceivedParams): Promise<void> {
  const fromName = senderName.trim() || 'Someone';
  const preview = previewText(bodyPreview);

  try {
    await createNotification({
      customerId: recipientId,
      avatarUrl: senderAvatarUrl ?? null,
      type: 7,
      category: 1,
      isUnRead: true,
      isArchived: false,
      title: `<p><strong>${fromName}</strong> sent you a message</p>`,
      content: preview,
    });
  } catch (error) {
    console.error('[Chat] Failed to create inbox notification', error);
  }

  const chatUrl = `/dashboard/chat?id=${encodeURIComponent(conversationId)}`;

  try {
    await sendWebPushToUser(recipientId, {
      title: `Message from ${fromName}`,
      body: preview,
      url: chatUrl,
      tag: `chat-${conversationId}`,
    });
  } catch (error) {
    console.error('[Chat] Failed to send web push', error);
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return;
  }

  try {
    await pusher.trigger(userChatChannel(recipientId), USER_CHAT_NEW_EVENT, {
      conversationId,
      messageId,
      bodyPreview: preview,
      fromName,
      fromAvatar: senderAvatarUrl ?? null,
    });
  } catch (error) {
    console.error('[Chat] Failed to push chat notification event', error);
  }
}
