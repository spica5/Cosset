import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'user_friends';

export type FriendStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'blocked';

export interface UserFriend {
  id: number;
  userId1: string;
  userId2: string;
  pairUserLow: string;
  pairUserHigh: string;
  status: FriendStatus;
  requestedAt: Date;
  respondedAt: Date | null;
}

let ensureUserFriendsTablePromise: Promise<void> | null = null;

const upsertFriendRelation = async (
  userId1: string,
  userId2: string,
  status: FriendStatus,
): Promise<UserFriend> => {
  const row = await queryOne<UserFriend>(
    `
      INSERT INTO ${TABLE_NAME} (
        user_id_1,
        user_id_2,
        status,
        requested_at,
        responded_at
      )
      VALUES (
        $1,
        $2,
        $3::varchar(20),
        NOW(),
        CASE WHEN $3::varchar(20) = 'pending'::varchar(20) THEN NULL ELSE NOW() END
      )
      ON CONFLICT (pair_user_low, pair_user_high)
      DO UPDATE SET
        user_id_1 = EXCLUDED.user_id_1,
        user_id_2 = EXCLUDED.user_id_2,
        status = EXCLUDED.status,
        requested_at = NOW(),
        responded_at = CASE WHEN EXCLUDED.status = 'pending' THEN NULL ELSE NOW() END
      RETURNING
        id,
        user_id_1 as "userId1",
        user_id_2 as "userId2",
        pair_user_low as "pairUserLow",
        pair_user_high as "pairUserHigh",
        status,
        requested_at as "requestedAt",
        responded_at as "respondedAt"
    `,
    [userId1, userId2, status],
  );

  if (!row) {
    throw new DatabaseError({
      code: 'UPSERT_FRIEND_REQUEST_FAILED',
      message: 'Failed to save friend relationship: No data returned',
    });
  }

  return row;
};

const ensureUserFriendsTable = async (): Promise<void> => {
  if (!ensureUserFriendsTablePromise) {
    ensureUserFriendsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id_1 UUID NOT NULL,
            user_id_2 UUID NOT NULL,

            pair_user_low UUID GENERATED ALWAYS AS (LEAST(user_id_1, user_id_2)) STORED,
            pair_user_high UUID GENERATED ALWAYS AS (GREATEST(user_id_1, user_id_2)) STORED,

            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP NULL,

            CONSTRAINT chk_no_self_friend CHECK (user_id_1 <> user_id_2),
            CONSTRAINT chk_friend_status CHECK (
              status IN ('pending', 'accepted', 'rejected', 'cancelled', 'blocked')
            ),
            CONSTRAINT uq_friend_pair UNIQUE (pair_user_low, pair_user_high),
            CONSTRAINT fk_user_friends_user1 FOREIGN KEY (user_id_1) REFERENCES cosset_users(id),
            CONSTRAINT fk_user_friends_user2 FOREIGN KEY (user_id_2) REFERENCES cosset_users(id)
          )
        `
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user1_status ON ${TABLE_NAME} (user_id_1, status)`
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user2_status ON ${TABLE_NAME} (user_id_2, status)`
      );
    })().catch((error) => {
      ensureUserFriendsTablePromise = null;
      throw error;
    });
  }

  await ensureUserFriendsTablePromise;
};

export async function createFriendRequest(userId1: string, userId2: string): Promise<UserFriend> {
  try {
    await ensureUserFriendsTable();

    return await upsertFriendRelation(userId1, userId2, 'pending');
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('chk_no_self_friend')) {
      throw new DatabaseError({
        code: 'INVALID_FRIEND_REQUEST',
        message: 'Cannot create a friendship with the same user',
      });
    }

    throw new DatabaseError({
      code: 'CREATE_FRIEND_REQUEST_ERROR',
      message: `Failed to create friend request: ${message}`,
    });
  }
}

export async function createOrUpdateFriendRelation(
  userId1: string,
  userId2: string,
  status: FriendStatus,
): Promise<UserFriend> {
  try {
    await ensureUserFriendsTable();

    return await upsertFriendRelation(userId1, userId2, status);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('chk_no_self_friend')) {
      throw new DatabaseError({
        code: 'INVALID_FRIEND_REQUEST',
        message: 'Cannot create a friendship with the same user',
      });
    }

    throw new DatabaseError({
      code: 'CREATE_OR_UPDATE_FRIEND_REQUEST_ERROR',
      message: `Failed to save friend relationship: ${message}`,
    });
  }
}

export async function getUserFriendById(id: number): Promise<UserFriend | null> {
  try {
    await ensureUserFriendsTable();

    const row = await queryOne<UserFriend>(
      `
        SELECT
          id,
          user_id_1 as "userId1",
          user_id_2 as "userId2",
          pair_user_low as "pairUserLow",
          pair_user_high as "pairUserHigh",
          status,
          requested_at as "requestedAt",
          responded_at as "respondedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id]
    );

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_FRIEND_ERROR',
        message: `Failed to fetch friend request: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserFriends(
  userId?: string,
  status?: FriendStatus,
  limit: number = 100,
  offset: number = 0,
): Promise<UserFriend[]> {
  try {
    await ensureUserFriendsTable();

    const params: unknown[] = [];
    const whereParts: string[] = [];

    if (userId) {
      params.push(userId);
      whereParts.push(`(user_id_1 = $${params.length} OR user_id_2 = $${params.length})`);
    }

    if (status) {
      params.push(status);
      whereParts.push(`status = $${params.length}`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    params.push(limit, offset);

    return await queryMany<UserFriend>(
      `
        SELECT
          id,
          user_id_1 as "userId1",
          user_id_2 as "userId2",
          pair_user_low as "pairUserLow",
          pair_user_high as "pairUserHigh",
          status,
          requested_at as "requestedAt",
          responded_at as "respondedAt"
        FROM ${TABLE_NAME}
        ${whereClause}
        ORDER BY requested_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_FRIENDS_ERROR',
        message: `Failed to fetch user friends: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function respondFriendRequest(id: number, userId2: string): Promise<UserFriend | null> {
  try {
    await ensureUserFriendsTable();

    return await queryOne<UserFriend>(
      `
        UPDATE ${TABLE_NAME}
        SET
          status = 'accepted',
          responded_at = NOW()
        WHERE id = $1
          AND user_id_2 = $2
          AND status = 'pending'
        RETURNING
          id,
          user_id_1 as "userId1",
          user_id_2 as "userId2",
          pair_user_low as "pairUserLow",
          pair_user_high as "pairUserHigh",
          status,
          requested_at as "requestedAt",
          responded_at as "respondedAt"
      `,
      [id, userId2]
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'RESPOND_FRIEND_REQUEST_ERROR',
        message: `Failed to respond friend request: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateFriendStatus(
  id: number,
  actorUserId: string,
  status: Exclude<FriendStatus, 'pending'>,
): Promise<UserFriend | null> {
  try {
    await ensureUserFriendsTable();

    if (status === 'accepted' || status === 'rejected') {
      return await queryOne<UserFriend>(
        `
          UPDATE ${TABLE_NAME}
          SET status = $1, responded_at = NOW()
          WHERE id = $2
            AND user_id_2 = $3
            AND status = 'pending'
          RETURNING
            id,
            user_id_1 as "userId1",
            user_id_2 as "userId2",
            pair_user_low as "pairUserLow",
            pair_user_high as "pairUserHigh",
            status,
            requested_at as "requestedAt",
            responded_at as "respondedAt"
        `,
        [status, id, actorUserId]
      );
    }

    if (status === 'cancelled') {
      return await queryOne<UserFriend>(
        `
          UPDATE ${TABLE_NAME}
          SET status = 'cancelled', responded_at = NOW()
          WHERE id = $1
            AND user_id_1 = $2
            AND status = 'pending'
          RETURNING
            id,
            user_id_1 as "userId1",
            user_id_2 as "userId2",
            pair_user_low as "pairUserLow",
            pair_user_high as "pairUserHigh",
            status,
            requested_at as "requestedAt",
            responded_at as "respondedAt"
        `,
        [id, actorUserId]
      );
    }

    return await queryOne<UserFriend>(
      `
        UPDATE ${TABLE_NAME}
        SET status = 'blocked', responded_at = NOW()
        WHERE id = $1
          AND (user_id_1 = $2 OR user_id_2 = $2)
        RETURNING
          id,
          user_id_1 as "userId1",
          user_id_2 as "userId2",
          pair_user_low as "pairUserLow",
          pair_user_high as "pairUserHigh",
          status,
          requested_at as "requestedAt",
          responded_at as "respondedAt"
      `,
      [id, actorUserId]
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_FRIEND_STATUS_ERROR',
        message: `Failed to update friend status: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteFriendRequest(id: number, userId: string): Promise<boolean> {
  try {
    await ensureUserFriendsTable();

    const result = await executeQuery(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
          AND (user_id_1 = $2 OR user_id_2 = $2)
      `,
      [id, userId]
    );

    return result.rowCount > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_FRIEND_REQUEST_ERROR',
        message: `Failed to delete friend request: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
