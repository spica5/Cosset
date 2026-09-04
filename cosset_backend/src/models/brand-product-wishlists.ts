import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureBrandProductsTable } from './brand-products';
import { ensureBrandStoresTable } from './brand-stores';

const TABLE_NAME = 'brand_product_wishlists';

export interface BrandProductWishlistRow {
  id: number;
  brandStoreId: number;
  productId: number;
  userId: string;
  createdAt?: Date | null;
}

export interface BrandProductWishlistItem {
  id: number;
  brandStoreId: number;
  productId: number;
  userId: string;
  createdAt?: Date | string | null;
  productName: string;
  productCode?: string | null;
  productDescription?: string | null;
  productPrice?: string | null;
  productCurrency?: string | null;
  productImage?: string | null;
  productStatus?: string | null;
  categoryName?: string | null;
  storeName?: string | null;
  storeLogoImage?: string | null;
}

let ensureTablePromise: Promise<void> | null = null;

export const ensureBrandProductWishlistsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await ensureBrandStoresTable();
      await ensureBrandProductsTable();

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            brand_store_id BIGINT NOT NULL,
            product_id BIGINT NOT NULL,
            user_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(product_id, user_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_wishlists_user ON ${TABLE_NAME} (user_id, created_at DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_wishlists_store ON ${TABLE_NAME} (brand_store_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_wishlists_product ON ${TABLE_NAME} (product_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function toggleBrandProductWishlist(
  brandStoreId: number,
  productId: number,
  userId: string,
): Promise<{ isWishlisted: boolean; wishlistCount: number; productWishlistCount: number }> {
  try {
    await ensureBrandProductWishlistsTable();

    const existing = await queryOne<BrandProductWishlistRow>(
      `SELECT id FROM ${TABLE_NAME} WHERE product_id = $1 AND user_id = $2 LIMIT 1`,
      [productId, userId],
    );

    if (existing) {
      await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE product_id = $1 AND user_id = $2`, [
        productId,
        userId,
      ]);
    } else {
      await executeQuery(
        `
          INSERT INTO ${TABLE_NAME} (brand_store_id, product_id, user_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, user_id) DO NOTHING
        `,
        [brandStoreId, productId, userId],
      );
    }

    const [storeCount, productCount] = await Promise.all([
      queryOne<{ wishlistCount: number }>(
        `SELECT COUNT(*)::int as "wishlistCount" FROM ${TABLE_NAME} WHERE brand_store_id = $1`,
        [brandStoreId],
      ),
      queryOne<{ wishlistCount: number }>(
        `SELECT COUNT(*)::int as "wishlistCount" FROM ${TABLE_NAME} WHERE product_id = $1`,
        [productId],
      ),
    ]);

    return {
      isWishlisted: !existing,
      wishlistCount: storeCount?.wishlistCount ?? 0,
      productWishlistCount: productCount?.wishlistCount ?? 0,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'TOGGLE_BRAND_PRODUCT_WISHLIST_ERROR',
        message: `Failed to toggle brand product wishlist: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserBrandProductWishlistIds(userId: string): Promise<number[]> {
  try {
    await ensureBrandProductWishlistsTable();

    const rows = await queryMany<{ productId: number }>(
      `
        SELECT product_id as "productId"
        FROM ${TABLE_NAME}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return rows.map((row) => row.productId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_PRODUCT_WISHLIST_IDS_ERROR',
        message: `Failed to get brand product wishlist ids: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserBrandProductWishlist(
  userId: string,
): Promise<BrandProductWishlistItem[]> {
  try {
    await ensureBrandProductWishlistsTable();

    return await queryMany<BrandProductWishlistItem>(
      `
        SELECT
          w.id::int as "id",
          w.brand_store_id::int as "brandStoreId",
          w.product_id::int as "productId",
          w.user_id::text as "userId",
          w.created_at as "createdAt",
          p.name as "productName",
          p.product_code as "productCode",
          p.description as "productDescription",
          p.price as "productPrice",
          p.currency as "productCurrency",
          p.image_url as "productImage",
          p.status as "productStatus",
          c.name as "categoryName",
          s.name as "storeName",
          s.logo_image as "storeLogoImage"
        FROM ${TABLE_NAME} w
        INNER JOIN brand_products p ON p.id = w.product_id
        LEFT JOIN brand_categories c ON c.id = p.category_id
        LEFT JOIN brand_stores s ON s.id = w.brand_store_id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC, w.id DESC
      `,
      [userId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_PRODUCT_WISHLIST_ERROR',
        message: `Failed to get brand product wishlist: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getBrandStoreWishlistCount(brandStoreId: number): Promise<number> {
  try {
    await ensureBrandProductWishlistsTable();

    const row = await queryOne<{ wishlistCount: number }>(
      `SELECT COUNT(*)::int as "wishlistCount" FROM ${TABLE_NAME} WHERE brand_store_id = $1`,
      [brandStoreId],
    );

    return row?.wishlistCount ?? 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BRAND_STORE_WISHLIST_COUNT_ERROR',
        message: `Failed to get brand store wishlist count: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserWishlistProductIdsForStore(
  brandStoreId: number,
  userId: string,
): Promise<number[]> {
  try {
    await ensureBrandProductWishlistsTable();

    const rows = await queryMany<{ productId: number }>(
      `
        SELECT product_id as "productId"
        FROM ${TABLE_NAME}
        WHERE brand_store_id = $1 AND user_id = $2
        ORDER BY created_at DESC
      `,
      [brandStoreId, userId],
    );

    return rows.map((row) => row.productId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_STORE_PRODUCT_WISHLIST_IDS_ERROR',
        message: `Failed to get store product wishlist ids: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
