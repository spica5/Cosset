import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'brand_stores';

export interface BrandStore {
  id: number;
  ownerCustomerId: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImage?: string | null;
  logoImage?: string | null;
  isPublic: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhotoURL?: string | null;
  categoryCount?: number;
  productCount?: number;
}

let ensureBrandStoresTablePromise: Promise<void> | null = null;

export const ensureBrandStoresTable = async (): Promise<void> => {
  if (!ensureBrandStoresTablePromise) {
    ensureBrandStoresTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            owner_customer_id VARCHAR(255) NOT NULL,
            name VARCHAR(120) NOT NULL,
            tagline VARCHAR(255) NULL,
            description TEXT NULL,
            cover_image TEXT NULL,
            logo_image TEXT NULL,
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_stores_owner ON ${TABLE_NAME} (owner_customer_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_stores_public ON ${TABLE_NAME} (is_public, created_at DESC)`,
      );

      // Ensure related tables exist before count subqueries run.
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS brand_categories (
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
        `
          CREATE TABLE IF NOT EXISTS brand_products (
            id BIGSERIAL PRIMARY KEY,
            store_id BIGINT NOT NULL,
            category_id BIGINT NOT NULL,
            name VARCHAR(160) NOT NULL,
            description TEXT NULL,
            price VARCHAR(40) NULL,
            currency VARCHAR(12) NULL DEFAULT 'USD',
            image_url TEXT NULL,
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
    })().catch((error) => {
      ensureBrandStoresTablePromise = null;
      throw error;
    });
  }

  await ensureBrandStoresTablePromise;
};

const STORE_SELECT = `
  s.id::int as "id",
  s.owner_customer_id as "ownerCustomerId",
  s.name,
  s.tagline,
  s.description,
  s.cover_image as "coverImage",
  s.logo_image as "logoImage",
  s.is_public as "isPublic",
  s.created_at as "createdAt",
  s.updated_at as "updatedAt",
  u.first_name as "ownerFirstName",
  u.last_name as "ownerLastName",
  u.email as "ownerEmail",
  u.photo_url as "ownerPhotoURL",
  (
    SELECT COUNT(*)::int FROM brand_categories c WHERE c.store_id = s.id
  ) as "categoryCount",
  (
    SELECT COUNT(*)::int FROM brand_products p WHERE p.store_id = s.id
  ) as "productCount"
`;

const STORE_FROM = `
  FROM ${TABLE_NAME} s
  LEFT JOIN cosset_users u ON u.id::text = s.owner_customer_id::text
`;

export async function getAllBrandStores(
  limit: number = 100,
  offset: number = 0,
  options?: { publicOnly?: boolean },
): Promise<BrandStore[]> {
  try {
    await ensureBrandStoresTable();

    const conditions = options?.publicOnly ? 'WHERE s.is_public = TRUE' : '';

    return await queryMany<BrandStore>(
      `
        SELECT ${STORE_SELECT}
        ${STORE_FROM}
        ${conditions}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT $1 OFFSET $2
      `,
      [Math.max(1, Math.min(300, limit)), Math.max(0, offset)],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORES_ERROR',
        message: `Failed to fetch brand stores: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandStoreById(id: number): Promise<BrandStore | null> {
  try {
    await ensureBrandStoresTable();

    return await queryOne<BrandStore>(
      `
        SELECT ${STORE_SELECT}
        ${STORE_FROM}
        WHERE s.id = $1
        LIMIT 1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORE_ERROR',
        message: `Failed to fetch brand store: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandStoreByOwner(ownerCustomerId: string): Promise<BrandStore | null> {
  try {
    await ensureBrandStoresTable();

    return await queryOne<BrandStore>(
      `
        SELECT ${STORE_SELECT}
        ${STORE_FROM}
        WHERE s.owner_customer_id::text = $1::text
        ORDER BY s.created_at ASC
        LIMIT 1
      `,
      [ownerCustomerId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORE_BY_OWNER_ERROR',
        message: `Failed to fetch owner brand store: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createBrandStore(input: {
  ownerCustomerId: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImage?: string | null;
  logoImage?: string | null;
  isPublic?: boolean;
}): Promise<BrandStore> {
  try {
    await ensureBrandStoresTable();

    const existing = await getBrandStoreByOwner(input.ownerCustomerId);
    if (existing) {
      throw new DatabaseError({
        code: 'BRAND_STORE_ALREADY_EXISTS',
        message: 'This business account already has a store',
      });
    }

    const created = await queryOne<BrandStore>(
      `
        INSERT INTO ${TABLE_NAME} (
          owner_customer_id,
          name,
          tagline,
          description,
          cover_image,
          logo_image,
          is_public,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING
          id::int as "id",
          owner_customer_id as "ownerCustomerId",
          name,
          tagline,
          description,
          cover_image as "coverImage",
          logo_image as "logoImage",
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        input.ownerCustomerId,
        input.name.trim(),
        input.tagline?.trim() || null,
        input.description?.trim() || null,
        input.coverImage || null,
        input.logoImage || null,
        input.isPublic !== false,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BRAND_STORE_FAILED',
        message: 'Failed to create brand store',
      });
    }

    return (await getBrandStoreById(created.id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CREATE_BRAND_STORE_ERROR',
      message: `Failed to create brand store: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateBrandStore(
  id: number,
  updates: Partial<{
    name: string;
    tagline: string | null;
    description: string | null;
    coverImage: string | null;
    logoImage: string | null;
    isPublic: boolean;
  }>,
): Promise<BrandStore> {
  try {
    await ensureBrandStoresTable();

    const fields: string[] = [];
    const values: (string | boolean | null)[] = [];
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
    if (updates.tagline !== undefined) {
      fields.push(`tagline = $${nextParam()}`);
      values.push(updates.tagline?.trim() || null);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${nextParam()}`);
      values.push(updates.description?.trim() || null);
    }
    if (updates.coverImage !== undefined) {
      fields.push(`cover_image = $${nextParam()}`);
      values.push(updates.coverImage || null);
    }
    if (updates.logoImage !== undefined) {
      fields.push(`logo_image = $${nextParam()}`);
      values.push(updates.logoImage || null);
    }
    if (updates.isPublic !== undefined) {
      fields.push(`is_public = $${nextParam()}`);
      values.push(updates.isPublic);
    }

    if (fields.length === 0) {
      const existing = await getBrandStoreById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_BRAND_STORE_FAILED',
          message: 'Brand store not found',
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
        code: 'UPDATE_BRAND_STORE_FAILED',
        message: 'Brand store not found',
      });
    }

    return (await getBrandStoreById(id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_BRAND_STORE_ERROR',
      message: `Failed to update brand store: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteBrandStore(id: number): Promise<boolean> {
  try {
    await ensureBrandStoresTable();

    await executeQuery(`DELETE FROM brand_products WHERE store_id = $1`, [id]);
    await executeQuery(`DELETE FROM brand_categories WHERE store_id = $1`, [id]);
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);

    return true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_BRAND_STORE_ERROR',
        message: `Failed to delete brand store: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
