/**
 * Gifts Model
 *
 * Provides functions to query and manage gifts in the database.
 *
 * @module models/gifts
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

/**
 * Table name for gifts 
 */
const TABLE_NAME = 'gifts';

/**
 * Gift record from the database
 */
export interface Gift {
  /** int8 */
  id: number;
  /** User id (foreign key to cosset_users) */
  userId?: string | null;
  /** Album title */
  title: string;
  /** Album description */
  description?: string | null;
  /** Category */
  category?: string | null;
  /** Image URLs (array of strings) */
  images?: string | null;
  /** Received From */
  receivedFrom: string | null;
  /** Received date */
  receivedDate?: Date | null;
  /** Openness */
  openness?: string | null;
  /** Creation timestamp */
  createdAt?: Date | null;
  /** Update timestamp */
  updatedAt?: Date | null;
}

/**
 * Get gift by ID
 *
 * @param id - Gift ID
 * @returns Gift object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function getGiftById(id: number): Promise<Gift | null> {
  try {
    const gift = await queryOne<Gift>(
      `
        SELECT
          id,
          user_id as "userId",
          title,
          description,
          received_from as "receivedFrom",
          received_date as "receivedDate",
          category,
          images,
          openness,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );

    return gift;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_GIFT_ERROR',
        message: `Failed to fetch gift: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get all gifts with pagination
 *
 * @param customerId - Optional customer ID to filter by
 * @param limit - Number of records to return (default: 10)
 * @param offset - Number of records to skip (default: 0)
 * @returns Array of gifts (empty array if none found)
 * @throws {DatabaseError} If query execution fails
 */
export async function getAllGifts(
  userId?: string,
  limit: number = 10,
  offset: number = 0,
): Promise<Gift[]> {
  try {
    let query = `
      SELECT
        id,
        user_id as "userId",
        title,
        description,
        received_from as "receivedFrom",
        received_date as "receivedDate",
        category,
        images,
        openness,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ${TABLE_NAME}
    `;
    const params: unknown[] = [];

    if (userId !== undefined) {
      query += ` WHERE user_id = $1`;
      params.push(userId);
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const gifts = await queryMany<Gift>(query, params);

    return gifts;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_GIFTS_ERROR',
        message: `Failed to fetch gifts: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Create a new gift
 *
 * @param gift - Gift data to insert
 * @returns The created gift object
 * @throws {DatabaseError} If query execution fails
 */
export async function createGift(
  gift: Omit<Gift, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Gift> {
  try {
    const createdGift = await queryOne<Gift>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          title,
          description,
          category,
          received_from,
          received_date,
          images,
          openness,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING
          id,
          user_id as "userId",
          title,
          description,
          category,
          received_from as "receivedFrom",
          received_date as "receivedDate",
          images,
          openness,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        gift.userId || null,
        gift.title,
        gift.description || null,
        gift.category || null,
        gift.receivedFrom || null,
        gift.receivedDate || null,
        gift.images || null,
        gift.openness || null,
      ],
    );

    if (!createdGift) {
      throw new DatabaseError({
        code: 'CREATE_GIFT_FAILED',
        message: 'Failed to create gift: No data returned',
      });
    }

    return createdGift;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_GIFT_ERROR',
        message: `Failed to create gift: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update a gift
 *
 * @param id - Gift ID
 * @param gift - Gift data to update
 * @returns The updated gift object
 * @throws {DatabaseError} If query execution fails
 */
export async function updateGift(
  id: number,
  gift: Partial<Omit<Gift, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Gift> {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (gift.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(gift.title);
      paramIndex += 1;
    }
    if (gift.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(gift.description);
      paramIndex += 1;
    }
    if (gift.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(gift.category);
      paramIndex += 1;
    }
    if (gift.receivedFrom !== undefined) {
      fields.push(`received_from = $${paramIndex}`);
      values.push(gift.receivedFrom);
      paramIndex += 1;
    }
    if (gift.receivedDate !== undefined) {
      fields.push(`received_date = $${paramIndex}`);
      values.push(gift.receivedDate);
      paramIndex += 1;
    }
    if (gift.images !== undefined) {
      fields.push(`images = $${paramIndex}`);
      values.push(gift.images);
      paramIndex += 1;
    }
    if (gift.openness !== undefined) {
      fields.push(`openness = $${paramIndex}`);
      values.push(gift.openness);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      const existing = await getGiftById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'GIFT_NOT_FOUND',
          message: `Gift with id ${id} not found`,
        });
      }
      return existing;
    }

    // set updated_at and add WHERE id
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const updatedGift = await queryOne<Gift>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          user_id as "userId",
          title,
          description,
          category,
          received_from as "receivedFrom",
          received_date as "receivedDate",
          images,
          openness,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    if (!updatedGift) {
      throw new DatabaseError({
        code: 'UPDATE_GIFT_FAILED',
        message: 'Failed to update gift: No data returned',
      });
    }

    return updatedGift;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_GIFT_ERROR',
        message: `Failed to update gift: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Delete a gift
 *
 * @param id - Gift ID
 * @returns true if gift was deleted, false if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function getGiftCount(
  userId?: string,
  openness?: string,
  category?: string
): Promise<number> {
  try {
    let query = `SELECT COUNT(*)::int AS count FROM ${TABLE_NAME}`;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (userId !== undefined) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(userId);
    }
    if (openness !== undefined) {
      const opennessText = String(openness).toLowerCase();

      if (opennessText === 'public') {
        conditions.push(`LOWER(COALESCE(openness::text, '')) IN ('public', '1', 'true')`);
      } else if (opennessText === 'private') {
        conditions.push(`LOWER(COALESCE(openness::text, '')) IN ('private', '0', 'false')`);
      } else {
        conditions.push(`LOWER(COALESCE(openness::text, '')) = LOWER($${params.length + 1})`);
        params.push(openness);
      }
    }
    if (category !== undefined) {
      const categoryText = String(category).toLowerCase();

      if (categoryText === 'gift') {
        conditions.push(`(category IS NULL OR BTRIM(category::text) = '' OR LOWER(category::text) IN ('gift', 'gifts'))`);
      } else {
        conditions.push(`LOWER(COALESCE(category::text, '')) = LOWER($${params.length + 1})`);
        params.push(category);
      }
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const row = await queryOne<{ count: number }>(query, params);
    return row?.count || 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_GIFT_COUNT_ERROR',
        message: `Failed to count gifts: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteGift(id: number): Promise<boolean> {
  try {
    const result = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return !!result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_GIFT_ERROR',
        message: `Failed to delete gift: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

