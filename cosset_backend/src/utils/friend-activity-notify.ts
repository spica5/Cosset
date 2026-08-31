import { sendWebPushToUser } from 'src/utils/web-push';

import { createNotification } from 'src/models/notifications';
import { listEnabledSubscribersForFriend } from 'src/models/friend-activity-notify';

// ----------------------------------------------------------------------

export const FRIEND_ACTIVITY_NOTIFICATION_TYPE = {
  post: 10,
  coffeeShop: 11,
  cinema: 12,
} as const;

type NotifyFriendActivityInput = {
  actorUserId: string;
  type: number;
  title: string;
  content: string;
  avatarUrl?: string | null;
  category?: number;
  url?: string;
  tag?: string;
};

/**
 * Notify users who explicitly opted in to this friend's Cosset activity.
 * Writes an in-app notification and sends a web push when subscribed.
 */
export async function notifyFriendActivitySubscribers(
  input: NotifyFriendActivityInput,
): Promise<void> {
  const subscriberIds = await listEnabledSubscribersForFriend(input.actorUserId);
  if (!subscriberIds.length) return;

  await Promise.all(
    subscriberIds.map(async (subscriberId) => {
      try {
        await createNotification({
          customerId: subscriberId,
          avatarUrl: input.avatarUrl ?? null,
          type: input.type,
          category: input.category ?? 1,
          isUnRead: true,
          isArchived: false,
          title: input.title,
          content: input.content,
        });

        await sendWebPushToUser(subscriberId, {
          title: input.title,
          body: input.content,
          url: input.url,
          tag: input.tag || `friend-activity-${input.actorUserId}`,
        });
      } catch (error) {
        console.error(
          `[FriendActivityNotify] failed for subscriber ${subscriberId}`,
          error,
        );
      }
    }),
  );
}
