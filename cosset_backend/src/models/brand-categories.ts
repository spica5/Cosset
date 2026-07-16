import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureBrandStoresTable } from './brand-stores';

const TABLE_NAME = 'brand_categories';

export interface BrandCategory {
  id: number;
  storeId: number;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  sortOrder: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  productCount?: number;
}

let ensureBrandCategoriesTablePromise: Promise<void> | null = null;

export const ensureBrandCategoriesTable = async (): Promise<void> => {
  await ensureBrandStoresTable();

  if (!ensureBrandCategoriesTablePromise) {
    ensureBrandCategoriesTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            store_id BIGINT NOT NULL,
            name VARCHAR(120) NOT NULL,
            description TEXT NULL,
            cover_image TEXT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_categories_store ON ${TABLE_NAME} (store_id, sort_order, id)`,
      );
    })().catch((error) => {
      ensureBrandCategoriesTablePromise = null;
      throw error;
    });
  }

  await ensureBrandCategoriesTablePromise;
};

const CATEGORY_SELECT = `
  c.id::int as "id",
  c.store_id::int as "storeId",
  c.name,
  c.description,
  c.cover_image as "coverImage",
  c.sort_order::int as "sortOrder",
  c.created_at as "createdAt",
  c.updated_at as "updatedAt",
  (
    SELECT COUNT(*)::int FROM brand_products p WHERE p.category_id = c.id
  ) as "productCount"
`;

export async function getBrandCategoriesByStore(storeId: number): Promise<BrandCategory[]> {
  try {
    await ensureBrandCategoriesTable();

    return await queryMany<BrandCategory>(
      `
        SELECT ${CATEGORY_SELECT}
        FROM ${TABLE_NAME} c
        WHERE c.store_id = $1
        ORDER BY c.sort_order ASC, c.id ASC
      `,
      [storeId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_CATEGORIES_ERROR',
        message: `Failed to fetch brand categories: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandCategoryById(id: number): Promise<BrandCategory | null> {
  try {
    await ensureBrandCategoriesTable();

    return await queryOne<BrandCategory>(
      `
        SELECT ${CATEGORY_SELECT}
        FROM ${TABLE_NAME} c
        WHERE c.id = $1
        LIMIT 1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_CATEGORY_ERROR',
        message: `Failed to fetch brand category: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createBrandCategory(input: {
  storeId: number;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  sortOrder?: number;
}): Promise<BrandCategory> {
  try {
    await ensureBrandCategoriesTable();

    const created = await queryOne<BrandCategory>(
      `
        INSERT INTO ${TABLE_NAME} (
          store_id,
          name,
          description,
          cover_image,
          sort_order,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          name,
          description,
          cover_image as "coverImage",
          sort_order::int as "sortOrder",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        input.storeId,
        input.name.trim(),
        input.description?.trim() || null,
        input.coverImage || null,
        input.sortOrder ?? 0,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BRAND_CATEGORY_FAILED',
        message: 'Failed to create brand category',
      });
    }

    return (await getBrandCategoryById(created.id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CREATE_BRAND_CATEGORY_ERROR',
      message: `Failed to create brand category: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateBrandCategory(
  id: number,
  updates: Partial<{
    name: string;
    description: string | null;
    coverImage: string | null;
    sortOrder: number;
  }>,
): Promise<BrandCategory> {
  try {
    await ensureBrandCategoriesTable();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 2;
    const nextParam = () => {
      const current = paramIndex;
      paramIndex += 1;
      return current;
    };

    if (updates.name !== undefined) {
      fields.push(`name = $${nextParam()}`);
      values.push(updates.name.trim());
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${nextParam()}`);
      values.push(updates.description?.trim() || null);
    }
    if (updates.coverImage !== undefined) {
      fields.push(`cover_image = $${nextParam()}`);
      values.push(updates.coverImage || null);
    }
    if (updates.sortOrder !== undefined) {
      fields.push(`sort_order = $${nextParam()}`);
      values.push(updates.sortOrder);
    }

    if (fields.length === 0) {
      const existing = await getBrandCategoryById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_BRAND_CATEGORY_FAILED',
          message: 'Brand category not found',
        });
      }
      return existing;
    }

    fields.push('updated_at = NOW()');

    const updated = await queryOne<{ id: number }>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING id
      `,
      [id, ...values],
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_BRAND_CATEGORY_FAILED',
        message: 'Brand category not found',
      });
    }

    return (await getBrandCategoryById(id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_BRAND_CATEGORY_ERROR',
      message: `Failed to update brand category: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteBrandCategory(id: number): Promise<boolean> {
  try {
    await ensureBrandCategoriesTable();

    await executeQuery(`DELETE FROM brand_products WHERE category_id = $1`, [id]);
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);

    return true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_BRAND_CATEGORY_ERROR',
        message: `Failed to delete brand category: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
