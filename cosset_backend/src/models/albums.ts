/**
 * Albums Model
 *
 * Provides functions to query and manage albums in the database.
 *
 * @module models/albums
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

/**
 * Table name for albums
 */
const TABLE_NAME = 'albums';

const normalizeOpenness = (openness: unknown): 0 | 1 => {
  if (typeof openness === 'number') {
    return openness === 1 ? 1 : 0;
  }

  if (typeof openness === 'string') {
    const normalized = openness.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true' ? 1 : 0;
  }

  if (typeof openness === 'boolean') {
    return openness ? 1 : 0;
  }

  return 0;
};

/**
 * Album record from the database
 */
export interface Album {
  /** int8 */
  id: number;
  /** User id (foreign key to cosset_users) */
  userId?: string | null;
  /** Album title */
  title: string;
  /** Album description */
  description?: string | null;
  /** Cover image key / url */
  coverUrl?: string | null;
  /** Category */
  category?: string | null;
  /** Openness input/output (int2 in DB, where 1=Public and others=Private) */
  openness?: number | 'Public' | 'Private' | null;
  /** Priority */
  priority?: number | null;
  /** Total views */
  totalViews?: number | null;
  /** Creation timestamp */
  createdAt?: Date | null;
  /** Update timestamp */
  updatedAt?: Date | null;
}

/**
 * Get album by ID
 *
 * @param id - Album ID
 * @returns Album object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function getAlbumById(id: number): Promise<Album | null> {
  try {
    const album = await queryOne<Album>(
      `
        SELECT
          id,
          user_id as "userId",
          title,
          description,
          cover_url as "coverUrl",
          category,
          CASE WHEN openness = 1 THEN 'Public' ELSE 'Private' END as "openness",
          priority,
          total_views as "totalViews",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );

    return album;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALBUM_ERROR',
        message: `Failed to fetch album: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get all albums with pagination
 *
 * @param customerId - Optional customer ID to filter by
 * @param limit - Number of records to return (default: 10)
 * @param offset - Number of records to skip (default: 0)
 * @returns Array of albums (empty array if none found)
 * @throws {DatabaseError} If query execution fails
 */
export async function getAllAlbums(
  userId?: string,
  limit: number = 10,
  offset: number = 0,
): Promise<Album[]> {
  try {
    let query = `
      SELECT
        id,
        user_id as "userId",
        title,
        description,
        cover_url as "coverUrl",
        category,
        CASE WHEN openness = 1 THEN 'Public' ELSE 'Private' END as "openness",
        priority,
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

    const albums = await queryMany<Album>(query, params);

    return albums;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_ALBUMS_ERROR',
        message: `Failed to fetch albums: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Create a new album
 *
 * @param album - Album data to insert
 * @returns The created album object
 * @throws {DatabaseError} If query execution fails
 */
export async function createAlbum(
  album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Album> {
  try {
    const createdAlbum = await queryOne<Album>(
      `
        INSERT INTO ${TABLE_NAME} (
          user_id,
          title,
          description,
          cover_url,
          category,
          openness,
          priority,
          total_views,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING
          id,
          user_id as "userId",
          title,
          description,
          cover_url as "coverUrl",
          category,
          CASE WHEN openness = 1 THEN 'Public' ELSE 'Private' END as "openness",
          priority,
          total_views as "totalViews",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        album.userId || null,
        album.title,
        album.description || null,
        album.coverUrl || null,
        album.category || null,
        normalizeOpenness(album.openness),
        album.priority ?? null,
        album.totalViews ?? null,
      ],
    );

    if (!createdAlbum) {
      throw new DatabaseError({
        code: 'CREATE_ALBUM_FAILED',
        message: 'Failed to create album: No data returned',
      });
    }

    return createdAlbum;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_ALBUM_ERROR',
        message: `Failed to create album: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update an album
 *
 * @param id - Album ID
 * @param album - Album data to update
 * @returns The updated album object
 * @throws {DatabaseError} If query execution fails
 */
export async function updateAlbum(
  id: number,
  album: Partial<Omit<Album, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Album> {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (album.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(album.title);
      paramIndex += 1;
    }
    if (album.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(album.description);
      paramIndex += 1;
    }
    if (album.coverUrl !== undefined) {
      fields.push(`cover_url = $${paramIndex}`);
      values.push(album.coverUrl);
      paramIndex += 1;
    }
    if (album.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(album.category);
      paramIndex += 1;
    }
    if (album.openness !== undefined) {
      fields.push(`openness = $${paramIndex}`);
      values.push(normalizeOpenness(album.openness));
      paramIndex += 1;
    }
    if (album.priority !== undefined) {
      fields.push(`priority = $${paramIndex}`);
      values.push(album.priority);
      paramIndex += 1;
    }
    if (album.totalViews !== undefined) {
      fields.push(`total_views = $${paramIndex}`);
      values.push(album.totalViews);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      const existing = await getAlbumById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'ALBUM_NOT_FOUND',
          message: `Album with id ${id} not found`,
        });
      }
      return existing;
    }

    // set updated_at and add WHERE id
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const updatedAlbum = await queryOne<Album>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          user_id as "userId",
          title,
          description as "description",
          cover_url as "coverUrl",
          category,
          CASE WHEN openness = 1 THEN 'Public' ELSE 'Private' END as "openness",
          priority,
          total_views as "totalViews",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    if (!updatedAlbum) {
      throw new DatabaseError({
        code: 'UPDATE_ALBUM_FAILED',
        message: 'Failed to update album: No data returned',
      });
    }

    return updatedAlbum;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_ALBUM_ERROR',
        message: `Failed to update album: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Atomically increment total_views for an album and return updated totalViews.
 */
export async function incrementAlbumViews(id: number): Promise<number> {
  try {
    const result = await queryOne<{ totalViews: number }>(
      `
        UPDATE ${TABLE_NAME}
        SET total_views = COALESCE(total_views, 0) + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING total_views as "totalViews"
      `,
      [id],
    );

    return result?.totalViews ?? 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'INCREMENT_ALBUM_VIEWS_ERROR',
        message: `Failed to increment album views: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Delete an album
 *
 * @param id - Album ID
 * @returns true if album was deleted, false if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function deleteAlbum(id: number): Promise<boolean> {
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
        code: 'DELETE_ALBUM_ERROR',
        message: `Failed to delete album: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

