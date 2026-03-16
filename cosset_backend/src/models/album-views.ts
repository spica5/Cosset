import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany, queryOne } from '@/db/neon';

const TABLE_NAME = 'album_views';

export interface AlbumView {
  id: number;
  albumId: number;
  customerId: number;
  viewedAt: Date;
  createdAt: Date;
}

let ensureAlbumViewsTablePromise: Promise<void> | null = null;

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const ensureAlbumViewsTable = async (): Promise<void> => {
  if (!ensureAlbumViewsTablePromise) {
    ensureAlbumViewsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            album_id BIGINT NOT NULL,
            customer_id BIGINT NOT NULL,
            viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_album_view UNIQUE (album_id, customer_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_album_views_customer ON ${TABLE_NAME} (customer_id)`
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_album_views_album ON ${TABLE_NAME} (album_id)`
      );
    })().catch((error) => {
      ensureAlbumViewsTablePromise = null;
      throw error;
    });
  }

  await ensureAlbumViewsTablePromise;
};

export async function markAlbumAsViewed(params: {
  albumId: number;
  customerId: number;
}): Promise<{ isFirstView: boolean; viewedAt: Date | null }> {
  try {
    await ensureAlbumViewsTable();

    const albumId = toInteger(params.albumId);
    const customerId = toInteger(params.customerId);

    if (albumId === null || customerId === null) {
      throw new DatabaseError({
        code: 'INVALID_ALBUM_VIEW_IDENTIFIERS',
        message: 'albumId and customerId must be valid integers',
      });
    }

    const inserted = await queryOne<{ viewedAt: Date }>(
      `
        INSERT INTO ${TABLE_NAME} (
          album_id,
          customer_id,
          viewed_at,
          created_at
        )
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (album_id, customer_id)
        DO NOTHING
        RETURNING viewed_at as "viewedAt"
      `,
      [albumId, customerId],
    );

    if (inserted) {
      return {
        isFirstView: true,
        viewedAt: inserted.viewedAt,
      };
    }

    const existing = await queryOne<{ viewedAt: Date }>(
      `
        SELECT viewed_at as "viewedAt"
        FROM ${TABLE_NAME}
        WHERE album_id = $1
          AND customer_id = $2
        LIMIT 1
      `,
      [albumId, customerId],
    );

    return {
      isFirstView: false,
      viewedAt: existing?.viewedAt ?? null,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'MARK_ALBUM_VIEW_ERROR',
        message: `Failed to mark album as viewed: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getViewedAlbumIdsByCustomer(
  customerId: number,
  ownerUserId?: string,
): Promise<number[]> {
  try {
    await ensureAlbumViewsTable();

    const normalizedCustomerId = toInteger(customerId);

    if (normalizedCustomerId === null) {
      throw new DatabaseError({
        code: 'INVALID_ALBUM_VIEW_CUSTOMER',
        message: 'customerId must be a valid integer',
      });
    }

    if (ownerUserId && ownerUserId.trim() !== '') {
      const rows = await queryMany<{ albumId: number | string }>(
        `
          SELECT av.album_id as "albumId"
          FROM ${TABLE_NAME} av
          INNER JOIN albums a ON a.id = av.album_id
          WHERE av.customer_id = $1
            AND a.user_id = $2
        `,
        [normalizedCustomerId, ownerUserId.trim()],
      );

      return rows
        .map((row) => Number.parseInt(String(row.albumId), 10))
        .filter((id) => Number.isFinite(id));
    }

    const rows = await queryMany<{ albumId: number | string }>(
      `
        SELECT album_id as "albumId"
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
      `,
      [normalizedCustomerId],
    );

    return rows
      .map((row) => Number.parseInt(String(row.albumId), 10))
      .filter((id) => Number.isFinite(id));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_VIEWED_ALBUM_IDS_ERROR',
        message: `Failed to fetch viewed album ids: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
