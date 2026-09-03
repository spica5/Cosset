import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

import { ensureBrandStoresTable } from './brand-stores';

const TABLE_NAME = 'brand_store_views';

let ensureTablePromise: Promise<void> | null = null;

export const ensureBrandStoreViewsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await ensureBrandStoresTable();

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            brand_store_id BIGINT NOT NULL,
            user_id UUID NOT NULL,
            viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(brand_store_id, user_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_store_views_store ON ${TABLE_NAME} (brand_store_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

/**
 * Marks a unique visit for an authenticated client.
 * Returns whether this was their first visit to the store.
 */
export async function markBrandStoreViewed(input: {
  brandStoreId: number;
  userId: string;
}): Promise<{ isFirstView: boolean; viewedAt: Date | null }> {
  try {
    await ensureBrandStoreViewsTable();

    const existing = await queryOne<{ viewedAt: Date }>(
      `
        SELECT viewed_at as "viewedAt"
        FROM ${TABLE_NAME}
        WHERE brand_store_id = $1 AND user_id = $2
        LIMIT 1
      `,
      [input.brandStoreId, input.userId],
    );

    if (existing) {
      return { isFirstView: false, viewedAt: existing.viewedAt };
    }

    const inserted = await queryOne<{ viewedAt: Date }>(
      `
        INSERT INTO ${TABLE_NAME} (brand_store_id, user_id, viewed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (brand_store_id, user_id) DO NOTHING
        RETURNING viewed_at as "viewedAt"
      `,
      [input.brandStoreId, input.userId],
    );

    if (!inserted) {
      const fallback = await queryOne<{ viewedAt: Date }>(
        `
          SELECT viewed_at as "viewedAt"
          FROM ${TABLE_NAME}
          WHERE brand_store_id = $1 AND user_id = $2
          LIMIT 1
        `,
        [input.brandStoreId, input.userId],
      );
      return { isFirstView: false, viewedAt: fallback?.viewedAt ?? null };
    }

    return { isFirstView: true, viewedAt: inserted.viewedAt };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'MARK_BRAND_STORE_VIEWED_ERROR',
        message: `Failed to mark brand store view: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
