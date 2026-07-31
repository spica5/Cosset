import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'community_post_favorites';

export interface CommunityPostFavorite {
  id: number;
  postId: number;
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
            post_id BIGINT NOT NULL,
            user_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, user_id)
          )
        `,
      );

      await executeQuery(
        `
          CREATE INDEX IF NOT EXISTS idx_community_post_favorites_user
          ON ${TABLE_NAME} (user_id, created_at DESC)
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function toggleCommunityPostFavorite(
  postId: number,
  userId: string,
): Promise<{ isFavorite: boolean }> {
  try {
    await ensureFavoritesTable();

    const existing = await queryOne<CommunityPostFavorite>(
      `SELECT id FROM ${TABLE_NAME} WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId],
    );

    if (existing) {
      await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE post_id = $1 AND user_id = $2`, [
        postId,
        userId,
      ]);
      return { isFavorite: false };
    }

    await executeQuery(
      `INSERT INTO ${TABLE_NAME} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, userId],
    );
    return { isFavorite: true };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'TOGGLE_COMMUNITY_POST_FAVORITE_ERROR',
        message: `Failed to toggle favorite: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserCommunityPostFavorites(userId: string): Promise<number[]> {
  try {
    await ensureFavoritesTable();

    const rows = await queryMany<{ postId: number }>(
      `SELECT post_id as "postId" FROM ${TABLE_NAME} WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );

    return rows.map((row) => Number(row.postId)).filter((id) => Number.isFinite(id));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COMMUNITY_POST_FAVORITES_ERROR',
        message: `Failed to get favorites: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
