/**
 * Collection Items Model
 *
 * Provides functions to query and manage collection items in the database.
 * Table: collection_items
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'collection_items';

export interface CollectionItem {
  id: number;
  customerId?: string | null;
  collectionId: number;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  isPublic?: number | null;
  date?: string | Date | null;
  images?: string | null;
  videos?: string | null;
  files?: string | null;
  updatedAt?: Date | null;
}

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
    let query = `
      SELECT
        id,
        customer_id as "customerId",
        collection_id as "collectionId",
        title,
        category,
        description,
        "public" as "isPublic",
        "date" as "date",
        images,
        videos,
        files,
        updated_at as "updatedAt"
      FROM ${TABLE_NAME}
      WHERE collection_id = $1
    `;

    const params: unknown[] = [collectionId];

    if (customerId !== undefined && customerId !== null) {
      query += ` AND customer_id = $2`;
      query += ` ORDER BY "date" DESC NULLS LAST, updated_at DESC, id DESC LIMIT $3 OFFSET $4`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY "date" DESC NULLS LAST, updated_at DESC, id DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    return await queryMany<CollectionItem>(query, params);
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
    return await queryOne<CollectionItem>(
      `
        SELECT
          id,
          customer_id as "customerId",
          collection_id as "collectionId",
          title,
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
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
    const created = await queryOne<CollectionItem>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          collection_id,
          title,
          category,
          description,
          "public",
          "date",
          images,
          videos,
          files,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING
          id,
          customer_id as "customerId",
          collection_id as "collectionId",
          title,
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
          updated_at as "updatedAt"
      `,
      [
        item.customerId ?? null,
        item.collectionId,
        item.title ?? null,
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

    return created;
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
      return existing;
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
          category,
          description,
          "public" as "isPublic",
          "date" as "date",
          images,
          videos,
          files,
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

    return updated;
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
