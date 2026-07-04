import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'coffee_shop_favorites';

export interface CoffeeShopFavorite {
  id: number;
  coffeeShopId: number;
  userId: string;
  createdAt?: Date | null;
}

let ensureTablePromise: Promise<void> | null = null;

const ensureFavoritesTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            coffee_shop_id INT NOT NULL,
            user_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(coffee_shop_id, user_id)
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

export async function toggleCoffeeShopFavorite(
  coffeeShopId: number,
  userId: string,
): Promise<{ isFavorite: boolean }> {
  try {
    await ensureFavoritesTable();

    const existing = await queryOne<CoffeeShopFavorite>(
      `SELECT id FROM ${TABLE_NAME} WHERE coffee_shop_id = $1 AND user_id = $2 LIMIT 1`,
      [coffeeShopId, userId],
    );

    if (existing) {
      await executeQuery(
        `DELETE FROM ${TABLE_NAME} WHERE coffee_shop_id = $1 AND user_id = $2`,
        [coffeeShopId, userId],
      );
      return { isFavorite: false };
    }

    await executeQuery(
      `INSERT INTO ${TABLE_NAME} (coffee_shop_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [coffeeShopId, userId],
    );
    return { isFavorite: true };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'TOGGLE_COFFEE_SHOP_FAVORITE_ERROR',
        message: `Failed to toggle favorite: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserCoffeeShopFavorites(
  userId: string,
): Promise<number[]> {
  try {
    await ensureFavoritesTable();

    const rows = await queryMany<{ coffeeShopId: number }>(
      `SELECT coffee_shop_id as "coffeeShopId" FROM ${TABLE_NAME} WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );

    return rows.map((row) => row.coffeeShopId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COFFEE_SHOP_FAVORITES_ERROR',
        message: `Failed to get favorites: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
