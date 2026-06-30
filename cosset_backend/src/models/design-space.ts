/**
 * Design Space Model
 *
 * Provides functions to manage design space records.
 * Table: design_space (id, customer_id, background, rooms, effects)
 *
 * @module models/design-space
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'design_space';

export type DesignSpaceType =
  | 'gentle-feminine-romantic'
  | 'serene-elegant'
  | 'warm-nostalgic'
  | 'strong-modern';

export interface DesignSpace {
  id: number;
  customerId: string | null;
  background: string | null;
  rooms: string | null;
  effects: string | null;
  designType: DesignSpaceType | null;
  createdAt?: Date;
  updatedAt?: Date;
}

let ensureDesignTypeColumnPromise: Promise<void> | null = null;

const DESIGN_SPACE_TYPES = new Set<DesignSpaceType>([
  'gentle-feminine-romantic',
  'serene-elegant',
  'warm-nostalgic',
  'strong-modern',
]);

const LEGACY_DESIGN_TYPE_MAP: Record<string, DesignSpaceType> = {
  normal: 'gentle-feminine-romantic',
  morning: 'warm-nostalgic',
  evening: 'serene-elegant',
  night: 'strong-modern',
};

export const normalizeDesignType = (value: unknown): DesignSpaceType => {
  const normalized = String(value || '').trim().toLowerCase();

  if (LEGACY_DESIGN_TYPE_MAP[normalized]) {
    return LEGACY_DESIGN_TYPE_MAP[normalized];
  }

  if (DESIGN_SPACE_TYPES.has(normalized as DesignSpaceType)) {
    return normalized as DesignSpaceType;
  }

  return 'gentle-feminine-romantic';
};

const ensureDesignTypeColumn = async (): Promise<void> => {
  if (!ensureDesignTypeColumnPromise) {
    ensureDesignTypeColumnPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS design_type VARCHAR(32) NOT NULL DEFAULT 'normal'`,
      );
    })().catch((error) => {
      ensureDesignTypeColumnPromise = null;
      throw error;
    });
  }

  await ensureDesignTypeColumnPromise;
};

const withDesignTypeColumn = async <T>(operation: () => Promise<T>): Promise<T> => {
  await ensureDesignTypeColumn();
  return operation();
};

/**
 * Create a new design space record
 */
export async function createDesignSpace(
  data: Omit<DesignSpace, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<DesignSpace> {
  return withDesignTypeColumn(async () => {
    try {
      const row = await queryOne<DesignSpace>(
        `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          background,
          rooms,
          effects,
          design_type
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects,
          design_type as "designType"
      `,
        [
          data.customerId ?? null,
          data.background ?? null,
          data.rooms ?? null,
          data.effects ?? null,
          normalizeDesignType(data.designType),
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
  });
}

/**
 * Get design spaces, optionally by customer_id
 */
export async function getDesignSpaces(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<DesignSpace[]> {
  return withDesignTypeColumn(async () => {
    try {
      let query = `
      SELECT
        id,
        customer_id as "customerId",
        background,
        rooms,
        effects,
        design_type as "designType"
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
  });
}

/**
 * Get design space by ID
 */
export async function getDesignSpaceById(id: number): Promise<DesignSpace | null> {
  return withDesignTypeColumn(async () => {
    try {
      return await queryOne<DesignSpace>(
        `
        SELECT
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects,
          design_type as "designType"
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
  });
}

/**
 * Update a design space by ID
 */
export async function updateDesignSpace(
  id: number,
  data: Partial<Pick<DesignSpace, 'background' | 'rooms' | 'effects' | 'designType'>>,
): Promise<DesignSpace | null> {
  return withDesignTypeColumn(async () => {
    try {
      const row = await queryOne<DesignSpace>(
        `
        UPDATE ${TABLE_NAME}
        SET
          background = COALESCE($2, background),
          rooms = COALESCE($3, rooms),
          effects = COALESCE($4, effects),
          design_type = COALESCE($5, design_type)
        WHERE id = $1
        RETURNING
          id,
          customer_id as "customerId",
          background,
          rooms,
          effects,
          design_type as "designType"
      `,
        [
          id,
          data.background ?? null,
          data.rooms ?? null,
          data.effects ?? null,
          data.designType != null ? normalizeDesignType(data.designType) : null,
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
  });
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
