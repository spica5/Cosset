import { sendWebPushToUser } from 'src/utils/web-push';
import { FRIEND_ACTIVITY_NOTIFICATION_TYPE } from 'src/utils/friend-activity-notify';

import { createNotification } from 'src/models/notifications';
import { listCinemaScheduleNotifyCustomerIds } from 'src/models/cinema-notification-prefs';

// ----------------------------------------------------------------------

type CinemaScheduleNotifyInput = {
  filmTitle?: string | null;
  filmPosterImage?: string | null;
  screeningId?: number | null;
  /** Optional: skip notifying this user (e.g. the admin who saved the schedule). */
  excludeCustomerId?: string | null;
};

export async function notifyCinemaScheduleSubscribers(
  input: CinemaScheduleNotifyInput,
): Promise<number> {
  const filmTitle = (input.filmTitle || 'a new film').trim() || 'a new film';
  const title = '<p><strong>Upcoming movie</strong> on Cosset Cinema</p>';
  const content = `"${filmTitle}" is now scheduled at Cosset Cinema`;
  const tag =
    input.screeningId != null
      ? `cinema-upcoming-${input.screeningId}`
      : `cinema-upcoming-${Date.now()}`;

  const recipients = (await listCinemaScheduleNotifyCustomerIds()).filter(
    (id) => id && id !== input.excludeCustomerId,
  );

  if (!recipients.length) {
    return 0;
  }

  await Promise.all(
    recipients.map(async (recipientId) => {
      try {
        await createNotification({
          customerId: recipientId,
          avatarUrl: input.filmPosterImage ?? null,
          type: FRIEND_ACTIVITY_NOTIFICATION_TYPE.cinema,
          category: 1,
          isUnRead: true,
          isArchived: false,
          title,
          content,
        });
        await sendWebPushToUser(recipientId, {
          title,
          body: content,
          url: '/dashboard/community/cinema',
          tag,
        });
      } catch (error) {
        console.error(`[CinemaScheduleNotify] failed for ${recipientId}`, error);
      }
    }),
  );

  return recipients.length;
}

export async function sendCinemaNotifyTestToUser(customerId: string): Promise<void> {
  const title = '<p><strong>Cinema alerts are on</strong></p>';
  const content = 'You will get alerts when Cosset posts a new cinema schedule or upcoming movie.';

  await createNotification({
    customerId,
    avatarUrl: null,
    type: FRIEND_ACTIVITY_NOTIFICATION_TYPE.cinema,
    category: 1,
    isUnRead: true,
    isArchived: false,
    title,
    content,
  });

  await sendWebPushToUser(customerId, {
    title,
    body: content,
    url: '/dashboard/community/cinema',
    tag: `cinema-test-${customerId}`,
  });
}
