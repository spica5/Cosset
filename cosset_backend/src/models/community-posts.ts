/**
 * Community Posts Model
 *
 * Provides CRUD functions for community_posts table.
 *
 * Required table DDL (run once in your database):
 *
 * CREATE TABLE IF NOT EXISTS community_posts (
 *   id         BIGSERIAL PRIMARY KEY,
 *   customer_id VARCHAR(255),
 *   title      VARCHAR(500),
 *   category   SMALLINT,
 *   description TEXT,
 *   content    TEXT,
 *   files       VARCHAR(1000),
 *   public     SMALLINT DEFAULT 0,
 *   total_views BIGINT DEFAULT 0,
 *   following  BIGINT DEFAULT 0,
 *   comments   TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * @module models/community-posts
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'community_posts';
const USERS_TABLE_NAME = 'cosset_users';

// ----------------------------------------------------------------------

export interface CommunityPost {
  id: number;
  customerId?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  content?: string | null;
  files?: string | null;
  isPublic?: number | null;
  totalViews?: number | null;
  following?: number | null;
  comments?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

// ----------------------------------------------------------------------

const COLUMN_SELECT = `
  cp.id,
  cp.customer_id AS "customerId",
  cu.first_name AS "customerFirstName",
  cu.last_name AS "customerLastName",
  COALESCE(
    NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
    cu.email,
    'Customer'
  ) AS "customerDisplayName",
  cu.email AS "customerEmail",
  cu.photo_url AS "customerPhotoURL",
  cp.title,
  cp.category,
  cp.description,
  cp.content,
  cp.files,
  cp."public" AS "isPublic",
  cp.total_views AS "totalViews",
  cp.following,
  cp.comments,
  cp.created_at AS "createdAt",
  cp.updated_at AS "updatedAt"
`;

const FROM_WITH_AUTHOR = `
  FROM ${TABLE_NAME} cp
  LEFT JOIN ${USERS_TABLE_NAME} cu ON cu.id = cp.customer_id
`;

// ----------------------------------------------------------------------

const normalizeSmallInt = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return fallback;
};

const normalizeNullableSmallInt = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  return normalizeSmallInt(value, 0);
};

const normalizeBigInt = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

// ----------------------------------------------------------------------

/**
 * Get all community posts with optional pagination and customer filter.
 */
export async function getAllCommunityPosts(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<CommunityPost[]> {
  try {
    const params: unknown[] = [];
    let query = `SELECT ${COLUMN_SELECT} ${FROM_WITH_AUTHOR}`;

    if (customerId !== undefined && customerId !== null) {
      query += ` WHERE cp.customer_id = $1 ORDER BY cp.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY cp.created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<CommunityPost>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_COMMUNITY_POSTS_ERROR',
        message: `Failed to fetch community posts: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Get a single community post by its ID.
 */
export async function getCommunityPostById(id: number): Promise<CommunityPost | null> {
  try {
    return await queryOne<CommunityPost>(
      `SELECT ${COLUMN_SELECT} ${FROM_WITH_AUTHOR} WHERE cp.id = $1 LIMIT 1`,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COMMUNITY_POST_ERROR',
        message: `Failed to fetch community post: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Create a new community post.
 */
export async function createCommunityPost(
  post: Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CommunityPost> {
  try {
    const created = await queryOne<{ id: number }>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id, title, category, description,
          content, files, "public", total_views, following, comments,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `,
      [
        post.customerId ?? null,
        post.title ?? null,
        normalizeNullableSmallInt(post.category),
        post.description ?? null,
        post.content ?? null,
        post.files ?? null,
        normalizeSmallInt(post.isPublic, 0),
        normalizeBigInt(post.totalViews, 0),
        normalizeBigInt(post.following, 0),
        post.comments ?? null,
      ],
    );

    if (!created?.id) {
      throw new DatabaseError({
        code: 'CREATE_COMMUNITY_POST_FAILED',
        message: 'Failed to create community post: no data returned',
      });
    }

    const hydratedPost = await getCommunityPostById(created.id);

    if (!hydratedPost) {
      throw new DatabaseError({
        code: 'CREATE_COMMUNITY_POST_FAILED',
        message: 'Created community post could not be reloaded',
      });
    }

    return hydratedPost;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_COMMUNITY_POST_ERROR',
        message: `Failed to create community post: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Update an existing community post.
 * Only the fields present in `updates` are changed; all others remain unchanged.
 */
export async function updateCommunityPost(
  id: number,
  updates: Partial<Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<CommunityPost> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if ('title' in updates) {
      setClauses.push(`title = $${paramIndex}`);
      params.push(updates.title ?? null);
      paramIndex += 1;
    }
    if ('category' in updates) {
      setClauses.push(`category = $${paramIndex}`);
      params.push(normalizeNullableSmallInt(updates.category));
      paramIndex += 1;
    }
    if ('description' in updates) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(updates.description ?? null);
      paramIndex += 1;
    }
    if ('content' in updates) {
      setClauses.push(`content = $${paramIndex}`);
      params.push(updates.content ?? null);
      paramIndex += 1;
    }
    if ('files' in updates) {
      setClauses.push(`files = $${paramIndex}`);
      params.push(updates.files ?? null);
      paramIndex += 1;
    }
    if ('isPublic' in updates) {
      setClauses.push(`"public" = $${paramIndex}`);
      params.push(normalizeSmallInt(updates.isPublic, 0));
      paramIndex += 1;
    }
    if ('totalViews' in updates) {
      setClauses.push(`total_views = $${paramIndex}`);
      params.push(normalizeBigInt(updates.totalViews, 0));
      paramIndex += 1;
    }
    if ('following' in updates) {
      setClauses.push(`following = $${paramIndex}`);
      params.push(normalizeBigInt(updates.following, 0));
      paramIndex += 1;
    }
    if ('comments' in updates) {
      setClauses.push(`comments = $${paramIndex}`);
      params.push(updates.comments ?? null);
      paramIndex += 1;
    }

    if (setClauses.length === 0) {
      const existing = await getCommunityPostById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'COMMUNITY_POST_NOT_FOUND',
          message: `Community post ${id} not found`,
        });
      }
      return existing;
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const updated = await queryOne<{ id: number }>(
      `
        UPDATE ${TABLE_NAME}
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `,
      params,
    );

    if (!updated?.id) {
      throw new DatabaseError({
        code: 'UPDATE_COMMUNITY_POST_FAILED',
        message: `Community post ${id} not found`,
      });
    }

    const hydratedPost = await getCommunityPostById(updated.id);

    if (!hydratedPost) {
      throw new DatabaseError({
        code: 'UPDATE_COMMUNITY_POST_FAILED',
        message: `Community post ${id} could not be reloaded`,
      });
    }

    return hydratedPost;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_COMMUNITY_POST_ERROR',
        message: `Failed to update community post: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Delete a community post by ID.
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteCommunityPost(id: number): Promise<boolean> {
  try {
    const deleted = await queryOne<{ id: number }>(
      `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING id`,
      [id],
    );
    return !!deleted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_COMMUNITY_POST_ERROR',
        message: `Failed to delete community post: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
