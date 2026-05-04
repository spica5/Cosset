/**
 * Collection Items Model
 *
 * Provides functions to query and manage collection items in the database.
 * Table: collection_items
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'collection_items';

let ensureCollectionItemViewsColumnPromise: Promise<void> | null = null;
let ensureCollectionItemOrderColumnPromise: Promise<void> | null = null;

const ensureCollectionItemViewsColumn = async (): Promise<void> => {
  if (!ensureCollectionItemViewsColumnPromise) {
    ensureCollectionItemViewsColumnPromise = executeQuery(
      `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS total_views BIGINT NOT NULL DEFAULT 0`,
    )
      .then(() => undefined)
      .catch((error) => {
        ensureCollectionItemViewsColumnPromise = null;
        throw error;
      });
  }

  await ensureCollectionItemViewsColumnPromise;
};

const ensureCollectionItemOrderColumn = async (): Promise<void> => {
  if (!ensureCollectionItemOrderColumnPromise) {
    ensureCollectionItemOrderColumnPromise = executeQuery(
      `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS "order" INTEGER`,
    )
      .then(() => undefined)
      .catch((error) => {
        ensureCollectionItemOrderColumnPromise = null;
        throw error;
      });
  }

  await ensureCollectionItemOrderColumnPromise;
};

export interface CollectionItem {
  id: number;
  customerId?: string | null;
  collectionId: number;
  title?: string | null;
  order?: number | null;
  category?: number | null;
  description?: string | null;
  isPublic?: number | null;
  date?: string | Date | null;
  images?: string | null;
  videos?: string | null;
  files?: string | null;
  totalViews?: number | null;
  updatedAt?: Date | null;
}

const normalizeTotalViews = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'bigint') {
    if (value <= BigInt(0)) {
      return 0;
    }

    const capped = value > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : value;
    return Number(capped);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.trunc(parsed));
  }

  return 0;
};

const normalizeCollectionItemRecord = (item: CollectionItem): CollectionItem => ({
  ...item,
  totalViews: normalizeTotalViews(item.totalViews),
});

const normalizeNullableInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeNullableDate = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

export async function getCollectionItems(
  collectionId: number,
  customerId?: string,
  limit: number = 100,
  offset: number = 0,
): Promise<CollectionItem[]> {
  try {
    await ensureCollectionItemViewsColumn();
    await ensureCollectionItemOrderColumn();

    let query = `
      SELECT
        id,
        customer_id as "customerId",
        collection_id as "collectionId",
        title,
        "order" as "order",
        category,
        description,
        "public" as "isPublic",
        "date" as "date",
        images,
        videos,
        files,
        total_views as "totalViews",
        updated_at as "updatedAt"
      FROM ${TABLE_NAME}
      WHERE collection_id = $1
    `;

    const params: unknown[] = [collectionId];

    if (customerId !== undefined && customerId !== null) {
      query += ` AND customer_id = $2`;
      query += ` ORDER BY "order" ASC NULLS LAST, "date" DESC NULLS LAST, updated_at DESC, id DESC LIMIT $3 OFFSET $4`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY "order" ASC NULLS LAST, "date" DESC NULLS LAST, updated_at DESC, id DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const items = await queryMany<CollectionItem>(query, params);
    return items.map(normalizeCollectionItemRecord);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COLLECTION_ITEMS_ERROR',
        message: `Failed to fetch collection items: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getCollectionItemById(id: number): Promise<CollectionItem | null> {
  try {
    await ensureCollectionItemViewsColumn();
    await ensureCollectionItemOrderColumn();

    const item = await queryOne<CollectionItem>(
      `
        SELECT
          id,
          customer_id as "customerId",
          collection_id as "collectionId",
          title,
          "order" as "order",
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
          total_views as "totalViews",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );

    return item ? normalizeCollectionItemRecord(item) : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COLLECTION_ITEM_ERROR',
        message: `Failed to fetch collection item: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createCollectionItem(
  item: Omit<CollectionItem, 'id' | 'updatedAt'>,
): Promise<CollectionItem> {
  try {
    await ensureCollectionItemViewsColumn();
    await ensureCollectionItemOrderColumn();

    const created = await queryOne<CollectionItem>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          collection_id,
          title,
          "order",
          category,
          description,
          "public",
          "date",
          images,
          videos,
          files,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING
          id,
          customer_id as "customerId",
          collection_id as "collectionId",
          title,
          "order" as "order",
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
          total_views as "totalViews",
          updated_at as "updatedAt"
      `,
      [
        item.customerId ?? null,
        item.collectionId,
        item.title ?? null,
        normalizeNullableInteger(item.order),
        normalizeNullableInteger(item.category),
        item.description ?? null,
        normalizeNullableInteger(item.isPublic),
        normalizeNullableDate(item.date),
        item.images ?? null,
        item.videos ?? null,
        item.files ?? null,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_COLLECTION_ITEM_FAILED',
        message: 'Failed to create collection item: No data returned',
      });
    }

    return normalizeCollectionItemRecord(created);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_COLLECTION_ITEM_ERROR',
        message: `Failed to create collection item: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateCollectionItem(
  id: number,
  updates: Partial<Omit<CollectionItem, 'id' | 'updatedAt'>>,
): Promise<CollectionItem> {
  try {
    await ensureCollectionItemViewsColumn();
    await ensureCollectionItemOrderColumn();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.customerId !== undefined) {
      fields.push(`customer_id = $${paramIndex}`);
      values.push(updates.customerId ?? null);
      paramIndex += 1;
    }

    if (updates.collectionId !== undefined) {
      fields.push(`collection_id = $${paramIndex}`);
      values.push(updates.collectionId);
      paramIndex += 1;
    }

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title ?? null);
      paramIndex += 1;
    }

    if (updates.order !== undefined) {
      fields.push(`"order" = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.order));
      paramIndex += 1;
    }

    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.category));
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.isPublic !== undefined) {
      fields.push(`"public" = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.isPublic));
      paramIndex += 1;
    }

    if (updates.date !== undefined) {
      fields.push(`"date" = $${paramIndex}`);
      values.push(normalizeNullableDate(updates.date));
      paramIndex += 1;
    }

    if (updates.images !== undefined) {
      fields.push(`images = $${paramIndex}`);
      values.push(updates.images ?? null);
      paramIndex += 1;
    }

    if (updates.videos !== undefined) {
      fields.push(`videos = $${paramIndex}`);
      values.push(updates.videos ?? null);
      paramIndex += 1;
    }

    if (updates.files !== undefined) {
      fields.push(`files = $${paramIndex}`);
      values.push(updates.files ?? null);
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getCollectionItemById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'COLLECTION_ITEM_NOT_FOUND',
          message: `Collection item with id ${id} not found`,
        });
      }
      return normalizeCollectionItemRecord(existing);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<CollectionItem>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          customer_id as "customerId",
          collection_id as "collectionId",
          title,
          "order" as "order",
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
          total_views as "totalViews",
          updated_at as "updatedAt"
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_COLLECTION_ITEM_FAILED',
        message: 'Failed to update collection item: No data returned',
      });
    }

    return normalizeCollectionItemRecord(updated);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_COLLECTION_ITEM_ERROR',
        message: `Failed to update collection item: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteCollectionItem(id: number): Promise<boolean> {
  try {
    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return !!deleted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_COLLECTION_ITEM_ERROR',
        message: `Failed to delete collection item: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Atomically increment total_views for a collection item and return updated totalViews.
 */
export async function incrementCollectionItemViews(id: number): Promise<number> {
  try {
    await ensureCollectionItemViewsColumn();

    const result = await queryOne<{ totalViews: number }>(
      `
        UPDATE ${TABLE_NAME}
        SET total_views = COALESCE(total_views, 0) + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING total_views as "totalViews"
      `,
      [id],
    );

    return normalizeTotalViews(result?.totalViews);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'INCREMENT_COLLECTION_ITEM_VIEWS_ERROR',
        message: `Failed to increment collection item views: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
