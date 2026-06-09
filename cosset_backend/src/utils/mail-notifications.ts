import { createNotification } from 'src/models/notifications';
import { getPusherServer, userMailChannel, USER_MAIL_NEW_EVENT } from 'src/utils/pusher';

type NotifyMailReceivedParams = {
  recipientId: string;
  mailId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  subject: string;
};

export async function notifyMailReceived({
  recipientId,
  mailId,
  senderName,
  senderAvatarUrl,
  subject,
}: NotifyMailReceivedParams): Promise<void> {
  const displaySubject = subject.trim() || '(No subject)';

  try {
    await createNotification({
      customerId: recipientId,
      avatarUrl: senderAvatarUrl ?? null,
      type: 8,
      category: 1,
      isUnRead: true,
      isArchived: false,
      title: `<p><strong>${senderName}</strong> sent you an email</p>`,
      content: displaySubject,
    });
  } catch (error) {
    console.error('[Mail] Failed to create inbox notification', error);
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return;
  }

  try {
    await pusher.trigger(userMailChannel(recipientId), USER_MAIL_NEW_EVENT, {
      mailId,
      subject: displaySubject,
      fromName: senderName,
      fromAvatar: senderAvatarUrl ?? null,
    });
  } catch (error) {
    console.error('[Mail] Failed to push mail notification event', error);
  }
}
