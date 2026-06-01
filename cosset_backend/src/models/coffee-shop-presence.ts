import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany } from '@/db/neon';

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
            is_hidden BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (coffee_shop_id, user_id)
          )
        `,
      );
   
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
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
    await ensureCoffeeShopPresenceTable();
    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (coffee_shop_id, user_id, joined_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (coffee_shop_id, user_id)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
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

export async function removeCoffeeShopPresence(coffeeShopId: number, userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toLowerCase();
  if (!UUID_RE.test(normalizedUserId)) {
    return;
  }

  try {
    await ensureCoffeeShopPresenceTable();
    await executeQuery(
      `
        DELETE FROM ${TABLE_NAME}
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
    await ensureCoffeeShopPresenceTable();

    const rows = await queryMany<{ userId: string }>(
      `
        SELECT user_id::text AS "userId"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1 AND is_hidden = FALSE
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
    await ensureCoffeeShopPresenceTable();
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
    await ensureCoffeeShopPresenceTable();
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
    await ensureCoffeeShopPresenceTable();
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
): Promise<Array<{ userId: string; joinedAt: string }>> {
  try {
    await ensureCoffeeShopPresenceTable();

    const rows = await queryMany<{ userId: string; joinedAt: string }>(
      `
        SELECT user_id::text AS "userId", joined_at::text AS "joinedAt"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1 AND is_hidden = FALSE
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
    await ensureCoffeeShopPresenceTable();
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
    await ensureCoffeeShopPresenceTable();

    const rows = await queryMany<{ coffeeShopId: number }>(
      `
        SELECT coffee_shop_id as "coffeeShopId"
        FROM ${TABLE_NAME}
        WHERE user_id = $1
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
