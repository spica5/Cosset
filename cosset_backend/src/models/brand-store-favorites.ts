import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureBrandStoresTable } from './brand-stores';

const TABLE_NAME = 'brand_store_favorites';

export interface BrandStoreFavorite {
  id: number;
  brandStoreId: number;
  userId: string;
  createdAt?: Date | null;
}

let ensureTablePromise: Promise<void> | null = null;

export const ensureBrandStoreFavoritesTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await ensureBrandStoresTable();

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            brand_store_id BIGINT NOT NULL,
            user_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(brand_store_id, user_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_store_favorites_user ON ${TABLE_NAME} (user_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_store_favorites_store ON ${TABLE_NAME} (brand_store_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function toggleBrandStoreFavorite(
  brandStoreId: number,
  userId: string,
): Promise<{ isFavorite: boolean; favoriteCount: number }> {
  try {
    await ensureBrandStoreFavoritesTable();

    const existing = await queryOne<BrandStoreFavorite>(
      `SELECT id FROM ${TABLE_NAME} WHERE brand_store_id = $1 AND user_id = $2 LIMIT 1`,
      [brandStoreId, userId],
    );

    if (existing) {
      await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE brand_store_id = $1 AND user_id = $2`, [
        brandStoreId,
        userId,
      ]);
    } else {
      await executeQuery(
        `INSERT INTO ${TABLE_NAME} (brand_store_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [brandStoreId, userId],
      );
    }

    const countRow = await queryOne<{ favoriteCount: number }>(
      `SELECT COUNT(*)::int as "favoriteCount" FROM ${TABLE_NAME} WHERE brand_store_id = $1`,
      [brandStoreId],
    );

    return {
      isFavorite: !existing,
      favoriteCount: countRow?.favoriteCount ?? 0,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'TOGGLE_BRAND_STORE_FAVORITE_ERROR',
        message: `Failed to toggle brand store favorite: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserBrandStoreFavorites(userId: string): Promise<number[]> {
  try {
    await ensureBrandStoreFavoritesTable();

    const rows = await queryMany<{ brandStoreId: number }>(
      `
        SELECT brand_store_id as "brandStoreId"
        FROM ${TABLE_NAME}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return rows.map((row) => row.brandStoreId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORE_FAVORITES_ERROR',
        message: `Failed to get brand store favorites: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandStoreFavoriteCount(brandStoreId: number): Promise<number> {
  try {
    await ensureBrandStoreFavoritesTable();

    const row = await queryOne<{ favoriteCount: number }>(
      `SELECT COUNT(*)::int as "favoriteCount" FROM ${TABLE_NAME} WHERE brand_store_id = $1`,
      [brandStoreId],
    );

    return row?.favoriteCount ?? 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORE_FAVORITE_COUNT_ERROR',
        message: `Failed to get brand store favorite count: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
