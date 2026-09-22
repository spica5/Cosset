import { sendWebPushToUser } from 'src/utils/web-push';
import { FRIEND_ACTIVITY_NOTIFICATION_TYPE } from 'src/utils/friend-activity-notify';
import {
  formatStartsInLabel,
  getUpcomingScreeningStartsWithin,
} from 'src/utils/cinema-screening-schedule';

import { createNotification } from 'src/models/notifications';
import {
  type CinemaFilmScreeningWithFilm,
  listPublicOfficialScreeningsWithFilm,
} from 'src/models/cinema-film-screenings';
import { claimCinemaScreeningReminder } from 'src/models/cinema-screening-reminders';
import { listCinemaScheduleNotifyCustomerIds } from 'src/models/cinema-notification-prefs';

// ----------------------------------------------------------------------

const CINEMA_URL = '/dashboard/community/cinema';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type CinemaScheduleNotifyInput = {
  filmTitle?: string | null;
  filmPosterImage?: string | null;
  screeningId?: number | null;
  showFlexible?: boolean | null;
  /** Optional: skip notifying this user (e.g. the admin who saved the schedule). */
  excludeCustomerId?: string | null;
};

type ScreeningShowPair = {
  screening: CinemaFilmScreeningWithFilm;
  showInstant: Date;
};

export async function notifyCinemaScheduleSubscribers(
  input: CinemaScheduleNotifyInput,
): Promise<number> {
  // Flexible screenings are admin preview only — never fan out to the community.
  if (input.showFlexible === true) {
    return 0;
  }

  const filmTitle = (input.filmTitle || 'a new film').trim() || 'a new film';
  const title = '<p><strong>Upcoming movie</strong> on Cosset Cinema</p>';
  const content = `"${filmTitle}" is now scheduled at Cosset Cinema`;
  const pushTitle = '🎬 Upcoming movie';
  const pushBody = `"${filmTitle}" is now scheduled at Cosset Cinema. Tap to see the showtimes.`;
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
          title: pushTitle,
          body: pushBody,
          url: CINEMA_URL,
          tag,
          image: input.filmPosterImage,
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
  const content =
    'You will get alerts for new cinema schedules and screenings starting within 24 hours.';
  const pushTitle = '🎬 Cinema alerts are on';
  const pushBody =
    'You will get phone alerts for new schedules and movies starting within 24 hours.';

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
    title: pushTitle,
    body: pushBody,
    url: CINEMA_URL,
    tag: `cinema-test-${customerId}`,
  });
}

export type CinemaScreeningReminderResult = {
  screeningsChecked: number;
  remindersSent: number;
};

async function sendScreeningReminderToRecipient(input: {
  recipientId: string;
  screening: CinemaFilmScreeningWithFilm;
  showInstant: Date;
  now: Date;
}): Promise<number> {
  const { recipientId, screening, showInstant, now } = input;
  const filmTitle = (screening.filmTitle || 'a Cosset film').trim() || 'a Cosset film';
  const startsIn = formatStartsInLabel(showInstant, now);
  const title = '<p><strong>Screening starts soon</strong> at Cosset Cinema</p>';
  const content = `"${filmTitle}" starts ${startsIn}`;
  const pushTitle = '🎬 Screening starts soon';
  const pushBody = `"${filmTitle}" starts ${startsIn} at Cosset Cinema. Tap to open.`;
  const tag = `cinema-soon-${screening.id}-${showInstant.toISOString()}`;

  try {
    const claimed = await claimCinemaScreeningReminder({
      customerId: recipientId,
      screeningId: screening.id,
      showInstant,
    });
    if (!claimed) return 0;

    await createNotification({
      customerId: recipientId,
      avatarUrl: screening.filmPosterImage ?? null,
      type: FRIEND_ACTIVITY_NOTIFICATION_TYPE.cinema,
      category: 1,
      isUnRead: true,
      isArchived: false,
      title,
      content,
    });

    await sendWebPushToUser(recipientId, {
      title: pushTitle,
      body: pushBody,
      url: CINEMA_URL,
      tag,
      image: screening.filmPosterImage,
    });

    return 1;
  } catch (error) {
    console.error(
      `[CinemaScreeningSoon] failed for ${recipientId} screening ${screening.id}`,
      error,
    );
    return 0;
  }
}

/**
 * Notify opted-in users about official Cosset Cinema showtimes starting within 24 hours.
 * Dedupes per user + screening + showtime so each reminder is sent once.
 */
export async function notifyCinemaScreeningsWithin24h(
  now = new Date(),
): Promise<CinemaScreeningReminderResult> {
  const recipients = await listCinemaScheduleNotifyCustomerIds();
  if (!recipients.length) {
    return { screeningsChecked: 0, remindersSent: 0 };
  }

  const screenings = await listPublicOfficialScreeningsWithFilm();

  const upcomingPairs: ScreeningShowPair[] = screenings.flatMap((screening) =>
    getUpcomingScreeningStartsWithin(screening, now, TWENTY_FOUR_HOURS_MS).map((showInstant) => ({
      screening,
      showInstant,
    })),
  );

  const sendResults = await Promise.all(
    upcomingPairs.flatMap(({ screening, showInstant }) =>
      recipients.map((recipientId) =>
        sendScreeningReminderToRecipient({
          recipientId,
          screening,
          showInstant,
          now,
        }),
      ),
    ),
  );

  const remindersSent = sendResults.reduce<number>((sum, value) => sum + value, 0);

  return { screeningsChecked: screenings.length, remindersSent };
}
