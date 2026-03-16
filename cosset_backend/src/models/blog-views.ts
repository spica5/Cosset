import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany, queryOne } from '@/db/neon';

const TABLE_NAME = 'blog_views';

export interface BlogView {
  id: number;
  blogId: number;
  customerId: number;
  viewedAt: Date;
  createdAt: Date;
}

let ensureBlogViewsTablePromise: Promise<void> | null = null;

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

const ensureBlogViewsTable = async (): Promise<void> => {
  if (!ensureBlogViewsTablePromise) {
    ensureBlogViewsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            blog_id BIGINT NOT NULL,
            customer_id BIGINT NOT NULL,
            viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_blog_view UNIQUE (blog_id, customer_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_blog_views_customer ON ${TABLE_NAME} (customer_id)`
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_blog_views_blog ON ${TABLE_NAME} (blog_id)`
      );
    })().catch((error) => {
      ensureBlogViewsTablePromise = null;
      throw error;
    });
  }

  await ensureBlogViewsTablePromise;
};

export async function markBlogAsViewed(params: {
  blogId: number;
  customerId: number;
}): Promise<{ isFirstView: boolean; viewedAt: Date | null }> {
  try {
    await ensureBlogViewsTable();

    const blogId = toInteger(params.blogId);
    const customerId = toInteger(params.customerId);

    if (blogId === null || customerId === null) {
      throw new DatabaseError({
        code: 'INVALID_BLOG_VIEW_IDENTIFIERS',
        message: 'blogId and customerId must be valid integers',
      });
    }

    const inserted = await queryOne<{ viewedAt: Date }>(
      `
        INSERT INTO ${TABLE_NAME} (
          blog_id,
          customer_id,
          viewed_at,
          created_at
        )
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (blog_id, customer_id)
        DO NOTHING
        RETURNING viewed_at as "viewedAt"
      `,
      [blogId, customerId],
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
        WHERE blog_id = $1
          AND customer_id = $2
        LIMIT 1
      `,
      [blogId, customerId],
    );

    return {
      isFirstView: false,
      viewedAt: existing?.viewedAt ?? null,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'MARK_BLOG_VIEW_ERROR',
        message: `Failed to mark blog as viewed: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getViewedBlogIdsByCustomer(
  customerId: number,
  ownerCustomerId?: string,
): Promise<number[]> {
  try {
    await ensureBlogViewsTable();

    const normalizedCustomerId = toInteger(customerId);

    if (normalizedCustomerId === null) {
      throw new DatabaseError({
        code: 'INVALID_BLOG_VIEW_CUSTOMER',
        message: 'customerId must be a valid integer',
      });
    }

    if (ownerCustomerId && ownerCustomerId.trim() !== '') {
      const rows = await queryMany<{ blogId: number | string }>(
        `
          SELECT bv.blog_id as "blogId"
          FROM ${TABLE_NAME} bv
          INNER JOIN blogs b ON b.id = bv.blog_id
          WHERE bv.customer_id = $1
            AND b.customer_id = $2
        `,
        [normalizedCustomerId, ownerCustomerId.trim()],
      );

      return rows
        .map((row) => Number.parseInt(String(row.blogId), 10))
        .filter((id) => Number.isFinite(id));
    }

    const rows = await queryMany<{ blogId: number | string }>(
      `
        SELECT blog_id as "blogId"
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
      `,
      [normalizedCustomerId],
    );

    return rows
      .map((row) => Number.parseInt(String(row.blogId), 10))
      .filter((id) => Number.isFinite(id));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_VIEWED_BLOG_IDS_ERROR',
        message: `Failed to fetch viewed blog ids: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
