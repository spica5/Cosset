import { DatabaseError } from '@/db/errors';
import { queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'coffee_shop_presence';

let ensureTablePromise: Promise<void> | null = null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ensureCoffeeShopPresenceTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            coffee_shop_id INT NOT NULL,
            user_id UUID NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP NULL DEFAULT NULL,
            is_hidden BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (coffee_shop_id, user_id)
          )
        `,
      );
      await executeQuery(`ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS left_at TIMESTAMP`);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const purgeExpiredCoffeeShopPresence = async (): Promise<void> => {
  // First, mark rows as left when they've been inactive for 30 minutes
  await executeQuery(
    `
      UPDATE ${TABLE_NAME}
      SET left_at =  NOW() 
      WHERE left_at IS NULL
        AND updated_at <= NOW() - INTERVAL '30 minutes'
    `,
  );

  // Then delete rows where the most recent event (updated_at or left_at) is older than 30 minutes
  // Delete users who have been left for more than 30 minutes
  await executeQuery(
    `
      DELETE FROM ${TABLE_NAME}
      WHERE left_at IS NOT NULL 
        AND left_at <= NOW() - INTERVAL '30 minutes'
    `,
  );
};

const ensureCoffeeShopPresenceTableAndPurge = async (): Promise<void> => {
  await ensureCoffeeShopPresenceTable();
  await purgeExpiredCoffeeShopPresence();
};

export async function upsertCoffeeShopPresence(coffeeShopId: number, userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_INVALID_USER',
      message: 'Invalid user id for presence',
    });
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (coffee_shop_id, user_id, joined_at, updated_at, left_at, is_hidden)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, FALSE)
        ON CONFLICT (coffee_shop_id, user_id)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP, left_at = NULL, is_hidden = FALSE
      `,
      [coffeeShopId, normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_JOIN_ERROR',
      message: `Failed to join coffee shop: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function touchCoffeeShopPresence(coffeeShopId: number, userId: string): Promise<boolean> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return false;
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    const result = await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET updated_at = CURRENT_TIMESTAMP, left_at = NULL
        WHERE coffee_shop_id = $1
          AND user_id = $2
          AND is_hidden = FALSE
      `,
      [coffeeShopId, normalizedUserId],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_TOUCH_ERROR',
      message: `Failed to refresh coffee shop presence: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeCoffeeShopPresence(coffeeShopId: number, userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return;
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET left_at = CURRENT_TIMESTAMP
        WHERE coffee_shop_id = $1 AND user_id = $2
      `,
      [coffeeShopId, normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_LEAVE_ERROR',
      message: `Failed to leave coffee shop: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listCoffeeShopPresenceUserIds(coffeeShopId: number): Promise<string[]> {
  try {
    await ensureCoffeeShopPresenceTableAndPurge();

    const rows = await queryMany<{ userId: string }>(
      `
        SELECT user_id::text AS "userId"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1
          AND is_hidden = FALSE
          AND left_at IS NULL
        ORDER BY joined_at ASC
      `,
      [coffeeShopId],
    );

    return rows.map((r) => r.userId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_LIST_ERROR',
      message: `Failed to list presence: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getCoffeeShopPresenceJoinedAt(
  coffeeShopId: number,
  userId: string,
): Promise<string | null> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return null;
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    const rows = await queryMany<{ joinedAt: string }>(
      `
        SELECT joined_at::text AS "joinedAt"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1 AND user_id = $2
      `,
      [coffeeShopId, normalizedUserId],
    );

    return rows.length > 0 ? rows[0].joinedAt : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_GET_JOINED_AT_ERROR',
      message: `Failed to get joined at: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function setCoffeeShopPresenceHidden(
  coffeeShopId: number,
  userId: string,
  isHidden: boolean,
): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_INVALID_USER',
      message: 'Invalid user id for presence',
    });
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET is_hidden = $1, updated_at = CURRENT_TIMESTAMP
        WHERE coffee_shop_id = $2 AND user_id = $3
      `,
      [isHidden, coffeeShopId, normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_SET_HIDDEN_ERROR',
      message: `Failed to set hidden status: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getCoffeeShopPresenceHidden(
  coffeeShopId: number,
  userId: string,
): Promise<boolean> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return false;
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    const rows = await queryMany<{ isHidden: boolean }>(
      `
        SELECT is_hidden AS "isHidden"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1 AND user_id = $2
      `,
      [coffeeShopId, normalizedUserId],
    );

    return rows.length > 0 ? rows[0].isHidden : false;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_GET_HIDDEN_ERROR',
      message: `Failed to get hidden status: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listCoffeeshopPresence(
  coffeeShopId: number,
  includeLeft = false,
): Promise<Array<{ userId: string; joinedAt: string; leftAt: string | null }>> {
  try {
    await ensureCoffeeShopPresenceTableAndPurge();

    const rows = await queryMany<{ userId: string; joinedAt: string; leftAt: string | null }>(
      `
        SELECT user_id::text AS "userId", joined_at::text AS "joinedAt", left_at::text AS "leftAt" 
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1
          AND is_hidden = FALSE
          ${includeLeft ? '' : 'AND left_at IS NULL'}
        ORDER BY joined_at ASC
      `,
      [coffeeShopId],
    );

    return rows;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_LIST_ERROR',
      message: `Failed to list presence: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeUserFromAllCoffeeShops(userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return;
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();
    await executeQuery(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE user_id = $1
      `,
      [normalizedUserId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_REMOVE_ALL_ERROR',
      message: `Failed to remove user from all coffee shops: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listUserCoffeeShops(userId: string): Promise<number[]> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return [];
  }

  try {
    await ensureCoffeeShopPresenceTableAndPurge();

    const rows = await queryMany<{ coffeeShopId: number }>(
      `
        SELECT coffee_shop_id as "coffeeShopId"
        FROM ${TABLE_NAME}
        WHERE user_id = $1
          AND left_at IS NULL
        ORDER BY coffee_shop_id ASC
      `,
      [normalizedUserId],
    );

    return rows.map((r) => r.coffeeShopId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_PRESENCE_LIST_USER_SHOPS_ERROR',
      message: `Failed to list user coffee shops: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
