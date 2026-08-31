import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'friend_activity_notify';

export type FriendActivityNotifyPref = {
  id: number;
  subscriberId: string;
  friendId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

let ensureTablePromise: Promise<void> | null = null;

const ensureFriendActivityNotifyTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            subscriber_id UUID NOT NULL,
            friend_id UUID NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_friend_activity_notify_not_self CHECK (subscriber_id <> friend_id),
            CONSTRAINT uq_friend_activity_notify_pair UNIQUE (subscriber_id, friend_id),
            CONSTRAINT fk_friend_activity_notify_subscriber
              FOREIGN KEY (subscriber_id) REFERENCES cosset_users(id) ON DELETE CASCADE,
            CONSTRAINT fk_friend_activity_notify_friend
              FOREIGN KEY (friend_id) REFERENCES cosset_users(id) ON DELETE CASCADE
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_friend_activity_notify_friend_enabled
          ON ${TABLE_NAME} (friend_id, enabled)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_friend_activity_notify_subscriber
          ON ${TABLE_NAME} (subscriber_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function listFriendActivityNotifyPrefs(
  subscriberId: string,
): Promise<FriendActivityNotifyPref[]> {
  try {
    await ensureFriendActivityNotifyTable();

    return await queryMany<FriendActivityNotifyPref>(
      `
        SELECT
          id,
          subscriber_id as "subscriberId",
          friend_id as "friendId",
          enabled,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE subscriber_id = $1
        ORDER BY updated_at DESC
      `,
      [subscriberId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'LIST_FRIEND_ACTIVITY_NOTIFY_ERROR',
      message: `Failed to list friend notification prefs: ${message}`,
    });
  }
}

export async function setFriendActivityNotifyPref(
  subscriberId: string,
  friendId: string,
  enabled: boolean,
): Promise<FriendActivityNotifyPref> {
  try {
    await ensureFriendActivityNotifyTable();

    const row = await queryOne<FriendActivityNotifyPref>(
      `
        INSERT INTO ${TABLE_NAME} (subscriber_id, friend_id, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (subscriber_id, friend_id)
        DO UPDATE SET
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
        RETURNING
          id,
          subscriber_id as "subscriberId",
          friend_id as "friendId",
          enabled,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [subscriberId, friendId, enabled],
    );

    if (!row) {
      throw new DatabaseError({
        code: 'SET_FRIEND_ACTIVITY_NOTIFY_FAILED',
        message: 'Failed to save friend notification preference',
      });
    }

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'SET_FRIEND_ACTIVITY_NOTIFY_ERROR',
      message: `Failed to save friend notification preference: ${message}`,
    });
  }
}

/** Users who opted in to receive activity notifications about `friendId`. */
export async function listEnabledSubscribersForFriend(friendId: string): Promise<string[]> {
  try {
    await ensureFriendActivityNotifyTable();

    const rows = await queryMany<{ subscriberId: string }>(
      `
        SELECT subscriber_id as "subscriberId"
        FROM ${TABLE_NAME}
        WHERE friend_id = $1
          AND enabled = TRUE
      `,
      [friendId],
    );

    return rows.map((row) => row.subscriberId).filter(Boolean);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'LIST_FRIEND_ACTIVITY_SUBSCRIBERS_ERROR',
      message: `Failed to list activity subscribers: ${message}`,
    });
  }
}
