import { DatabaseError } from '@/db/errors';
import { queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'cinema_presence';

let ensureTablePromise: Promise<void> | null = null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CinemaRoomKey = {
  ownerCustomerId: string;
  category: string;
};

const normalizeRoom = (room: CinemaRoomKey) => ({
  ownerCustomerId: String(room.ownerCustomerId || '').trim(),
  category: String(room.category || '').trim().toLowerCase(),
});

const ensureCinemaPresenceTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            owner_customer_id VARCHAR(255) NOT NULL,
            category VARCHAR(24) NOT NULL,
            user_id UUID NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP NULL DEFAULT NULL,
            is_hidden BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (owner_customer_id, category, user_id)
          )
        `,
      );
      await executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS left_at TIMESTAMP`);
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_cinema_presence_room ON ${TABLE_NAME} (owner_customer_id, category, joined_at)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const purgeExpiredCinemaPresence = async (): Promise<void> => {
  await executeQuery(
    `
      UPDATE ${TABLE_NAME}
      SET left_at = NOW()
      WHERE left_at IS NULL
        AND updated_at <= NOW() - INTERVAL '30 minutes'
    `,
  );

  await executeQuery(
    `
      DELETE FROM ${TABLE_NAME}
      WHERE left_at IS NOT NULL
        AND left_at <= NOW() - INTERVAL '30 minutes'
    `,
  );
};

const ensureCinemaPresenceTableAndPurge = async (): Promise<void> => {
  await ensureCinemaPresenceTable();
  await purgeExpiredCinemaPresence();
};

export async function upsertCinemaPresence(room: CinemaRoomKey, userId: string): Promise<void> {
  const { ownerCustomerId, category } = normalizeRoom(room);
  const normalizedUserId = userId.trim().toLowerCase();

  if (!ownerCustomerId || !category) {
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_INVALID_ROOM',
      message: 'Invalid cinema room',
    });
  }

  if (!UUID_RE.test(normalizedUserId)) {
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_INVALID_USER',
      message: 'Invalid user id for presence',
    });
  }

  try {
    await ensureCinemaPresenceTableAndPurge();
    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (owner_customer_id, category, user_id, joined_at, updated_at, left_at, is_hidden)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, FALSE)
        ON CONFLICT (owner_customer_id, category, user_id)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP, left_at = NULL, is_hidden = FALSE
      `,
      [ownerCustomerId, category, normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_JOIN_ERROR',
      message: `Failed to join cinema: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function touchCinemaPresence(room: CinemaRoomKey, userId: string): Promise<boolean> {
  const { ownerCustomerId, category } = normalizeRoom(room);
  const normalizedUserId = userId.trim().toLowerCase();

  if (!UUID_RE.test(normalizedUserId)) {
    return false;
  }

  try {
    await ensureCinemaPresenceTableAndPurge();
    const result = await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET updated_at = CURRENT_TIMESTAMP, left_at = NULL
        WHERE owner_customer_id = $1
          AND category = $2
          AND user_id = $3
          AND is_hidden = FALSE
      `,
      [ownerCustomerId, category, normalizedUserId],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_TOUCH_ERROR',
      message: `Failed to refresh cinema presence: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeCinemaPresence(room: CinemaRoomKey, userId: string): Promise<void> {
  const { ownerCustomerId, category } = normalizeRoom(room);
  const normalizedUserId = userId.trim().toLowerCase();

  if (!UUID_RE.test(normalizedUserId)) {
    return;
  }

  try {
    await ensureCinemaPresenceTableAndPurge();
    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET left_at = CURRENT_TIMESTAMP
        WHERE owner_customer_id = $1 AND category = $2 AND user_id = $3
      `,
      [ownerCustomerId, category, normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_LEAVE_ERROR',
      message: `Failed to leave cinema: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getCinemaPresenceJoinedAt(
  room: CinemaRoomKey,
  userId: string,
): Promise<string | null> {
  const { ownerCustomerId, category } = normalizeRoom(room);
  const normalizedUserId = userId.trim().toLowerCase();

  if (!UUID_RE.test(normalizedUserId)) {
    return null;
  }

  try {
    await ensureCinemaPresenceTableAndPurge();
    const rows = await queryMany<{ joinedAt: string }>(
      `
        SELECT joined_at::text AS "joinedAt"
        FROM ${TABLE_NAME}
        WHERE owner_customer_id = $1 AND category = $2 AND user_id = $3
      `,
      [ownerCustomerId, category, normalizedUserId],
    );

    return rows.length > 0 ? rows[0].joinedAt : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_GET_JOINED_AT_ERROR',
      message: `Failed to get joined at: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listCinemaPresence(
  room: CinemaRoomKey,
  includeLeft = false,
): Promise<Array<{ userId: string; joinedAt: string; leftAt: string | null }>> {
  const { ownerCustomerId, category } = normalizeRoom(room);

  try {
    await ensureCinemaPresenceTableAndPurge();

    return await queryMany<{ userId: string; joinedAt: string; leftAt: string | null }>(
      `
        SELECT user_id::text AS "userId", joined_at::text AS "joinedAt", left_at::text AS "leftAt"
        FROM ${TABLE_NAME}
        WHERE owner_customer_id = $1
          AND category = $2
          AND is_hidden = FALSE
          ${includeLeft ? '' : 'AND left_at IS NULL'}
        ORDER BY joined_at ASC
      `,
      [ownerCustomerId, category],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_LIST_ERROR',
      message: `Failed to list presence: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeUserFromAllCinemas(userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return;
  }

  try {
    await ensureCinemaPresenceTableAndPurge();
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE user_id = $1`, [normalizedUserId]);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_REMOVE_ALL_ERROR',
      message: `Failed to remove user from cinemas: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listUserCinemaRooms(
  userId: string,
): Promise<Array<{ ownerCustomerId: string; category: string }>> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return [];
  }

  try {
    await ensureCinemaPresenceTableAndPurge();

    return await queryMany<{ ownerCustomerId: string; category: string }>(
      `
        SELECT owner_customer_id AS "ownerCustomerId", category
        FROM ${TABLE_NAME}
        WHERE user_id = $1 AND left_at IS NULL
        ORDER BY updated_at DESC
      `,
      [normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_PRESENCE_LIST_USER_ROOMS_ERROR',
      message: `Failed to list user cinema rooms: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
