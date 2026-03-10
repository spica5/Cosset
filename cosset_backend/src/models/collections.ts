/**
 * Collections Model
 *
 * Provides functions to query and manage collections in the database.
 * Table: collections
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'collections';

export interface Collection {
  id: number;
  customerId?: string | null;
  name: string;
  description?: string | null;
  category?: number | null;
  reference?: string | null;
  order?: number | null;
  createdAt?: Date | null;
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

export async function getAllCollections(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Collection[]> {
  try {
    let query = `
      SELECT
        id,
        customer_id as "customerId",
        name,
        description,
        category,
        reference,
        "order" as "order",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ${TABLE_NAME}
    `;

    const params: unknown[] = [];

    if (customerId !== undefined && customerId !== null) {
      query += ` WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<Collection>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_COLLECTIONS_ERROR',
        message: `Failed to fetch collections: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getCollectionById(id: number): Promise<Collection | null> {
  try {
    return await queryOne<Collection>(
      `
        SELECT
          id,
          customer_id as "customerId",
          name,
          description,
          category,
          reference,
          "order" as "order",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COLLECTION_ERROR',
        message: `Failed to fetch collection: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createCollection(
  collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Collection> {
  try {
    const created = await queryOne<Collection>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          name,
          description,
          category,
          reference,
          "order",
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING
          id,
          customer_id as "customerId",
          name,
          description,
          category,
          reference,
          "order" as "order",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        collection.customerId ?? null,
        collection.name,
        collection.description ?? null,
        normalizeNullableInteger(collection.category),
        collection.reference ?? null,
        normalizeNullableInteger(collection.order),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_COLLECTION_FAILED',
        message: 'Failed to create collection: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_COLLECTION_ERROR',
        message: `Failed to create collection: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateCollection(
  id: number,
  updates: Partial<Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Collection> {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.customerId !== undefined) {
      fields.push(`customer_id = $${paramIndex}`);
      values.push(updates.customerId ?? null);
      paramIndex += 1;
    }

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.category));
      paramIndex += 1;
    }

    if (updates.reference !== undefined) {
      fields.push(`reference = $${paramIndex}`);
      values.push(updates.reference ?? null);
      paramIndex += 1;
    }

    if (updates.order !== undefined) {
      fields.push(`"order" = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.order));
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getCollectionById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection with id ${id} not found`,
        });
      }
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await queryOne<Collection>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          customer_id as "customerId",
          name,
          description,
          category,
          reference,
          "order" as "order",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_COLLECTION_FAILED',
        message: 'Failed to update collection: No data returned',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_COLLECTION_ERROR',
        message: `Failed to update collection: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteCollection(id: number): Promise<boolean> {
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
        code: 'DELETE_COLLECTION_ERROR',
        message: `Failed to delete collection: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
