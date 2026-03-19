/**
 * Gifts Model
 *
 * Provides functions to query and manage gifts in the database.
 *
 * @module models/gifts
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

/**
 * Table name for gifts 
 */
const TABLE_NAME = 'gifts';

let ensureGiftViewsColumnPromise: Promise<void> | null = null;

const ensureGiftViewsColumn = async (): Promise<void> => {
  if (!ensureGiftViewsColumnPromise) {
    ensureGiftViewsColumnPromise = executeQuery(
      `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS total_views BIGINT NOT NULL DEFAULT 0`,
    )
      .then(() => undefined)
      .catch((error) => {
        ensureGiftViewsColumnPromise = null;
        throw error;
      });
  }

  await ensureGiftViewsColumnPromise;
};

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
  openness?: string | number | boolean | null;
  /** Total views */
  totalViews?: number | null;
  /** Creation timestamp */
  createdAt?: Date | null;
  /** Update timestamp */
  updatedAt?: Date | null;
}

const normalizeGiftTotalViews = (value: unknown): number => {
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

const normalizeGiftRecord = (gift: Gift): Gift => ({
  ...gift,
  totalViews: normalizeGiftTotalViews(gift.totalViews),
});

const normalizeGiftOpenness = (value: unknown): 0 | 1 | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    if (normalized === 'public' || normalized === '1' || normalized === 'true') {
      return 1;
    }

    if (normalized === 'private' || normalized === '0' || normalized === 'false') {
      return 0;
    }
  }

  return 0;
};

/**
 * Get gift by ID
 *
 * @param id - Gift ID
 * @returns Gift object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function getGiftById(id: number): Promise<Gift | null> {
  try {
    await ensureGiftViewsColumn();

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
          total_views as "totalViews",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );

    return gift ? normalizeGiftRecord(gift) : null;
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
    await ensureGiftViewsColumn();

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
        total_views as "totalViews",
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

    return gifts.map(normalizeGiftRecord);
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
    await ensureGiftViewsColumn();

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
          total_views,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW())
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
          total_views as "totalViews",
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
        normalizeGiftOpenness(gift.openness),
      ],
    );

    if (!createdGift) {
      throw new DatabaseError({
        code: 'CREATE_GIFT_FAILED',
        message: 'Failed to create gift: No data returned',
      });
    }

    return normalizeGiftRecord(createdGift);
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
    await ensureGiftViewsColumn();

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
      values.push(normalizeGiftOpenness(gift.openness));
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
          total_views as "totalViews",
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

    return normalizeGiftRecord(updatedGift);
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
    await ensureGiftViewsColumn();

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

export async function getGiftIdsByFilters(
  userId: string,
  openness?: string,
  category?: string,
): Promise<number[]> {
  try {
    await ensureGiftViewsColumn();

    let query = `SELECT id FROM ${TABLE_NAME} WHERE user_id = $1`;
    const params: unknown[] = [userId];
    const conditions: string[] = [];

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
        conditions.push(
          `(category IS NULL OR BTRIM(category::text) = '' OR LOWER(category::text) IN ('gift', 'gifts'))`,
        );
      } else {
        conditions.push(`LOWER(COALESCE(category::text, '')) = LOWER($${params.length + 1})`);
        params.push(category);
      }
    }

    if (conditions.length) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    const rows = await queryMany<{ id: number | string }>(query, params);

    return rows
      .map((row) => {
        if (typeof row.id === 'number' && Number.isFinite(row.id)) {
          return Math.trunc(row.id);
        }

        if (typeof row.id === 'string' && row.id.trim() !== '') {
          const parsed = Number.parseInt(row.id, 10);
          return Number.isNaN(parsed) ? 0 : parsed;
        }

        return 0;
      })
      .filter((id) => id > 0);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_GIFT_IDS_BY_FILTERS_ERROR',
        message: `Failed to fetch gift ids by filters: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteGift(id: number): Promise<boolean> {
  try {
    await ensureGiftViewsColumn();

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

/**
 * Atomically increment total_views for a gift and return updated totalViews.
 */
export async function incrementGiftViews(id: number): Promise<number> {
  try {
    await ensureGiftViewsColumn();

    const updated = await queryOne<{ totalViews: number | string | null }>(
      `
        UPDATE ${TABLE_NAME}
        SET total_views = COALESCE(total_views, 0) + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING total_views as "totalViews"
      `,
      [id],
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'GIFT_NOT_FOUND',
        message: `Gift with id ${id} not found`,
      });
    }

    return normalizeGiftTotalViews(updated.totalViews);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'INCREMENT_GIFT_VIEWS_ERROR',
        message: `Failed to increment gift views: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

