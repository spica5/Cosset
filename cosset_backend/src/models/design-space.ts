/**
 * Design Space Model
 *
 * Provides functions to manage design space records.
 * Table: design_space (id, customer_id, background, rooms, effects)
 *
 * @module models/design-space
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'design_space';

export interface DesignSpace {
  id: number;
  customerId: string | null;
  background: string | null;
  rooms: string | null;
  effects: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a new design space record
 */
export async function createDesignSpace(
  data: Omit<DesignSpace, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<DesignSpace> {
  try {
    const row = await queryOne<DesignSpace>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          background,
          rooms,
          effects
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects
      `,
      [
        data.customerId ?? null,
        data.background ?? null,
        data.rooms ?? null,
        data.effects ?? null,
      ],
    );

    if (!row) {
      throw new DatabaseError({
        code: 'CREATE_DESIGN_SPACE_FAILED',
        message: 'Failed to create design space: No data returned',
      });
    }

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_DESIGN_SPACE_ERROR',
        message: `Failed to create design space: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get design spaces, optionally by customer_id
 */
export async function getDesignSpaces(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<DesignSpace[]> {
  try {
    let query = `
      SELECT
        id,
        customer_id as "customerId",
        background,
        rooms,
        effects
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

    return await queryMany<DesignSpace>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_DESIGN_SPACES_ERROR',
        message: `Failed to fetch design spaces: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get design space by ID
 */
export async function getDesignSpaceById(id: number): Promise<DesignSpace | null> {
  try {
    return await queryOne<DesignSpace>(
      `
        SELECT
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_DESIGN_SPACE_ERROR',
        message: `Failed to fetch design space: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update a design space by ID
 */
export async function updateDesignSpace(
  id: number,
  data: Partial<Pick<DesignSpace, 'background' | 'rooms' | 'effects'>>,
): Promise<DesignSpace | null> {
  try {
    const row = await queryOne<DesignSpace>(
      `
        UPDATE ${TABLE_NAME}
        SET
          background = COALESCE($2, background),
          rooms = COALESCE($3, rooms),
          effects = COALESCE($4, effects)
        WHERE id = $1
        RETURNING
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects
      `,
      [
        id,
        data.background ?? null,
        data.rooms ?? null,
        data.effects ?? null,
      ],
    );
    return row;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_DESIGN_SPACE_ERROR',
        message: `Failed to update design space: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Delete a design space by ID
 */
export async function deleteDesignSpace(id: number): Promise<void> {
  try {
    await queryOne(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_DESIGN_SPACE_ERROR',
        message: `Failed to delete design space: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
