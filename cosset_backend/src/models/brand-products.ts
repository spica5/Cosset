import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureBrandCategoriesTable } from './brand-categories';

const TABLE_NAME = 'brand_products';

export type BrandProductStatus = 'available' | 'sold_out' | 'wishlist';

export interface BrandProduct {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  productCode?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  /** Primary/cover image (first of images) */
  imageUrl?: string | null;
  /** All product gallery images */
  images: string[];
  status: BrandProductStatus;
  /** Derived from status === 'available' for older clients */
  isAvailable: boolean;
  sortOrder: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  categoryName?: string | null;
}

export function normalizeBrandProductStatus(
  value: unknown,
  fallbackAvailable = true,
): BrandProductStatus {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (raw === 'available' || raw === 'sold_out' || raw === 'wishlist') {
    return raw;
  }

  if (typeof value === 'boolean') {
    return value ? 'available' : 'sold_out';
  }

  return fallbackAvailable ? 'available' : 'sold_out';
}

export function parseBrandProductImages(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fall through to single-key handling
    }
  }

  return [trimmed];
}

export function serializeBrandProductImages(
  images?: string[] | null,
  imageUrl?: string | null,
): string | null {
  const fromList = (images || []).map((item) => String(item || '').trim()).filter(Boolean);
  if (fromList.length) {
    return JSON.stringify(fromList);
  }

  const single = String(imageUrl || '').trim();
  return single || null;
}

const mapBrandProductRow = (
  row: BrandProduct & { imageUrl?: string | null; status?: string | null },
): BrandProduct => {
  const images = parseBrandProductImages(row.imageUrl);
  const status = normalizeBrandProductStatus(row.status, row.isAvailable !== false);
  return {
    ...row,
    images,
    imageUrl: images[0] || null,
    status,
    isAvailable: status === 'available',
  };
};

let ensureBrandProductsTablePromise: Promise<void> | null = null;

export const ensureBrandProductsTable = async (): Promise<void> => {
  await ensureBrandCategoriesTable();

  if (!ensureBrandProductsTablePromise) {
    ensureBrandProductsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            store_id BIGINT NOT NULL,
            category_id BIGINT NOT NULL,
            name VARCHAR(160) NOT NULL,
            description TEXT NULL,
            price VARCHAR(40) NULL,
            currency VARCHAR(12) NULL DEFAULT 'USD',
            image_url TEXT NULL,
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            status VARCHAR(20) NOT NULL DEFAULT 'available',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available'`,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS product_code VARCHAR(80) NULL`,
      );

      await executeQuery(
        `
          UPDATE ${TABLE_NAME}
          SET status = CASE
            WHEN COALESCE(is_available, TRUE) = FALSE THEN 'sold_out'
            ELSE 'available'
          END
          WHERE status IS NULL
             OR TRIM(status) = ''
             OR status NOT IN ('available', 'sold_out', 'wishlist')
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_products_store ON ${TABLE_NAME} (store_id, sort_order, id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_products_category ON ${TABLE_NAME} (category_id, sort_order, id)`,
      );
    })().catch((error) => {
      ensureBrandProductsTablePromise = null;
      throw error;
    });
  }

  await ensureBrandProductsTablePromise;
};

const PRODUCT_SELECT = `
  p.id::int as "id",
  p.store_id::int as "storeId",
  p.category_id::int as "categoryId",
  p.name,
  p.product_code as "productCode",
  p.description,
  p.price,
  p.currency,
  p.image_url as "imageUrl",
  COALESCE(NULLIF(TRIM(p.status), ''), CASE WHEN p.is_available THEN 'available' ELSE 'sold_out' END) as "status",
  p.is_available as "isAvailable",
  p.sort_order::int as "sortOrder",
  p.created_at as "createdAt",
  p.updated_at as "updatedAt",
  c.name as "categoryName"
`;

export async function getBrandProductsByStore(
  storeId: number,
  categoryId?: number,
): Promise<BrandProduct[]> {
  try {
    await ensureBrandProductsTable();

    const params: number[] = [storeId];
    let categoryFilter = '';

    if (categoryId) {
      params.push(categoryId);
      categoryFilter = `AND p.category_id = $${params.length}`;
    }

    return (
      await queryMany<BrandProduct>(
        `
        SELECT ${PRODUCT_SELECT}
        FROM ${TABLE_NAME} p
        LEFT JOIN brand_categories c ON c.id = p.category_id
        WHERE p.store_id = $1
          ${categoryFilter}
        ORDER BY p.sort_order ASC, p.id ASC
      `,
        params,
      )
    ).map(mapBrandProductRow);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_PRODUCTS_ERROR',
        message: `Failed to fetch brand products: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandProductById(id: number): Promise<BrandProduct | null> {
  try {
    await ensureBrandProductsTable();

    const row = await queryOne<BrandProduct>(
      `
        SELECT ${PRODUCT_SELECT}
        FROM ${TABLE_NAME} p
        LEFT JOIN brand_categories c ON c.id = p.category_id
        WHERE p.id = $1
        LIMIT 1
      `,
      [id],
    );

    return row ? mapBrandProductRow(row) : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_PRODUCT_ERROR',
        message: `Failed to fetch brand product: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createBrandProduct(input: {
  storeId: number;
  categoryId: number;
  name: string;
  productCode?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  imageUrl?: string | null;
  images?: string[] | null;
  status?: BrandProductStatus | string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}): Promise<BrandProduct> {
  try {
    await ensureBrandProductsTable();

    const imagePayload = serializeBrandProductImages(input.images, input.imageUrl);
    const status = normalizeBrandProductStatus(
      input.status ?? input.isAvailable,
      input.isAvailable !== false,
    );
    const productCode = String(input.productCode || '').trim() || null;

    const created = await queryOne<BrandProduct>(
      `
        INSERT INTO ${TABLE_NAME} (
          store_id,
          category_id,
          name,
          product_code,
          description,
          price,
          currency,
          image_url,
          is_available,
          status,
          sort_order,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          category_id::int as "categoryId",
          name,
          product_code as "productCode",
          description,
          price,
          currency,
          image_url as "imageUrl",
          status,
          is_available as "isAvailable",
          sort_order::int as "sortOrder",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        input.storeId,
        input.categoryId,
        input.name.trim(),
        productCode,
        input.description?.trim() || null,
        input.price?.trim() || null,
        input.currency?.trim() || 'USD',
        imagePayload,
        status === 'available',
        status,
        input.sortOrder ?? 0,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_BRAND_PRODUCT_FAILED',
        message: 'Failed to create brand product',
      });
    }

    return (await getBrandProductById(created.id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CREATE_BRAND_PRODUCT_ERROR',
      message: `Failed to create brand product: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateBrandProduct(
  id: number,
  updates: Partial<{
    categoryId: number;
    name: string;
    productCode: string | null;
    description: string | null;
    price: string | null;
    currency: string | null;
    imageUrl: string | null;
    images: string[] | null;
    status: BrandProductStatus | string | null;
    isAvailable: boolean;
    sortOrder: number;
  }>,
): Promise<BrandProduct> {
  try {
    await ensureBrandProductsTable();

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 2;
    const nextParam = () => {
      const current = paramIndex;
      paramIndex += 1;
      return current;
    };

    if (updates.categoryId !== undefined) {
      fields.push(`category_id = $${nextParam()}`);
      values.push(updates.categoryId);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${nextParam()}`);
      values.push(updates.name.trim());
    }
    if (updates.productCode !== undefined) {
      fields.push(`product_code = $${nextParam()}`);
      values.push(String(updates.productCode || '').trim() || null);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${nextParam()}`);
      values.push(updates.description?.trim() || null);
    }
    if (updates.price !== undefined) {
      fields.push(`price = $${nextParam()}`);
      values.push(updates.price?.trim() || null);
    }
    if (updates.currency !== undefined) {
      fields.push(`currency = $${nextParam()}`);
      values.push(updates.currency?.trim() || 'USD');
    }
    if (updates.images !== undefined || updates.imageUrl !== undefined) {
      fields.push(`image_url = $${nextParam()}`);
      values.push(serializeBrandProductImages(updates.images, updates.imageUrl));
    }
    if (updates.status !== undefined || updates.isAvailable !== undefined) {
      const status = normalizeBrandProductStatus(
        updates.status ?? updates.isAvailable,
        updates.isAvailable !== false,
      );
      fields.push(`status = $${nextParam()}`);
      values.push(status);
      fields.push(`is_available = $${nextParam()}`);
      values.push(status === 'available');
    }
    if (updates.sortOrder !== undefined) {
      fields.push(`sort_order = $${nextParam()}`);
      values.push(updates.sortOrder);
    }

    if (fields.length === 0) {
      const existing = await getBrandProductById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'UPDATE_BRAND_PRODUCT_FAILED',
          message: 'Brand product not found',
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
        code: 'UPDATE_BRAND_PRODUCT_FAILED',
        message: 'Brand product not found',
      });
    }

    return (await getBrandProductById(id))!;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_BRAND_PRODUCT_ERROR',
      message: `Failed to update brand product: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteBrandProduct(id: number): Promise<boolean> {
  try {
    await ensureBrandProductsTable();
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);
    return true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_BRAND_PRODUCT_ERROR',
        message: `Failed to delete brand product: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
