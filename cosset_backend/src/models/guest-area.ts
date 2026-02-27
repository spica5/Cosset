/**
 * Guest Area Model
 *
 * Provides functions to manage guest area records (representative picture section).
 * Table: guest_area (id, customer_id, title, motif, mood, picture_url, design_space)
 * picture_url stores the S3 object key (file key); resolve to signed URL for display.
 *
 * @module models/guest-area
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'guest_area';

export interface GuestArea {
  id: number;
  customerId: string | null;
  title: string;
  motif: string | null;
  mood: string | null;
  coverUrl: string | null; // S3 object key (file key)
  designSpace: string | null;
  drawer: string | null; // JSON string for drawer sharing settings
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a new guest area record
 */
export async function createGuestArea(
  data: Omit<GuestArea, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<GuestArea> {
  try {
    const row = await queryOne<GuestArea>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          title,
          motif,
          mood,
          picture_url,
          design_space,
          drawer
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          customer_id as "customerId",
          title,
          motif,
          mood,
          picture_url as "coverUrl",
          design_space as "designSpace",
          drawer
      `,
      [
        data.customerId ?? null,
        data.title,
        data.motif ?? null,
        data.mood ?? null,
        data.coverUrl ?? null,
        data.designSpace ?? null,
        data.drawer ?? null,
      ],
    );

    if (!row) {
      throw new DatabaseError({
        code: 'CREATE_GUEST_AREA_FAILED',
        message: 'Failed to create guest area: No data returned',
      });
    }

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_GUEST_AREA_ERROR',
        message: `Failed to create guest area: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get guest areas (e.g. for listing), optionally by customer_id
 */
export async function getGuestAreas(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<GuestArea[]> {
  try {
    let query = `
      SELECT
        id,
        customer_id as "customerId",
        title,
        motif,
        mood,
        picture_url as "coverUrl",
        design_space as "designSpace",
        drawer
      FROM ${TABLE_NAME}
    `;
    const params: unknown[] = [];

    if (customerId !== undefined && customerId !== null) {
      query += ` WHERE customer_id = $1`;
      params.push(customerId);
      query += ` ORDER BY id DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY id DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<GuestArea>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_GUEST_AREAS_ERROR',
        message: `Failed to fetch guest areas: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get guest area by ID
 */
export async function getGuestAreaById(id: number): Promise<GuestArea | null> {
  try {
    return await queryOne<GuestArea>(
      `
        SELECT
          id,
          customer_id as "customerId",
          title,
          motif,
          mood,
          picture_url as "coverUrl",
          design_space as "designSpace",
          drawer
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_GUEST_AREA_ERROR',
        message: `Failed to fetch guest area: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update a guest area by ID
 */
export async function updateGuestArea(
  id: number,
  data: Partial<Pick<GuestArea, 'title' | 'motif' | 'mood' | 'coverUrl' | 'designSpace' | 'drawer'>>,
): Promise<GuestArea | null> {
  try {
    const row = await queryOne<GuestArea>(
      `
        UPDATE ${TABLE_NAME}
        SET
          title = COALESCE($2, title),
          motif = COALESCE($3, motif),
          mood = COALESCE($4, mood),
          picture_url = COALESCE($5, picture_url),
          design_space = COALESCE($6, design_space),
          drawer = COALESCE($7, drawer)
        WHERE id = $1
        RETURNING
          id,
          customer_id as "customerId",
          title,
          motif,
          mood,
          picture_url as "coverUrl",
          design_space as "designSpace",
          drawer
      `,
      [
        id,
        data.title ?? null,
        data.motif ?? null,
        data.mood ?? null,
        data.coverUrl ?? null,
        data.designSpace ?? null,
        data.drawer ?? null,
      ],
    );
    return row;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_GUEST_AREA_ERROR',
        message: `Failed to update guest area: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
