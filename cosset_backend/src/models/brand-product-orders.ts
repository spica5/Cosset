import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { ensureBrandProductsTable } from './brand-products';

const TABLE_NAME = 'brand_product_orders';

export type BrandProductOrderStatus = 'purchased' | 'fulfilled' | 'cancelled';

export interface BrandProductOrder {
  id: number;
  storeId: number;
  productId: number;
  productName: string;
  productImage?: string | null;
  price?: string | null;
  currency?: string | null;
  quantity: number;
  status: BrandProductOrderStatus;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  note?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export type BrandProductOrderInsert = {
  storeId: number;
  productId: number;
  productName: string;
  productImage?: string | null;
  price?: string | null;
  currency?: string | null;
  quantity: number;
  customerId: string | null;
  customerName: string;
  customerEmail?: string | null;
  note?: string | null;
};

let ensureTablePromise: Promise<void> | null = null;

export const ensureBrandProductOrdersTable = async (): Promise<void> => {
  await ensureBrandProductsTable();

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            store_id BIGINT NOT NULL,
            product_id BIGINT NOT NULL,
            product_name VARCHAR(160) NOT NULL,
            product_image TEXT NULL,
            price VARCHAR(40) NULL,
            currency VARCHAR(12) NULL,
            quantity INT NOT NULL DEFAULT 1,
            status VARCHAR(24) NOT NULL DEFAULT 'purchased',
            customer_id VARCHAR(255) NULL,
            customer_name VARCHAR(120) NOT NULL,
            customer_email VARCHAR(255) NULL,
            note TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_orders_store ON ${TABLE_NAME} (store_id, created_at DESC, id DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_orders_product ON ${TABLE_NAME} (product_id, created_at DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_brand_product_orders_customer ON ${TABLE_NAME} (customer_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function createBrandProductOrder(
  row: BrandProductOrderInsert,
): Promise<BrandProductOrder> {
  try {
    await ensureBrandProductOrdersTable();

    const inserted = await queryOne<BrandProductOrder>(
      `
        INSERT INTO ${TABLE_NAME} (
          store_id,
          product_id,
          product_name,
          product_image,
          price,
          currency,
          quantity,
          status,
          customer_id,
          customer_name,
          customer_email,
          note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'purchased', $8, $9, $10, $11)
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          product_id::int as "productId",
          product_name as "productName",
          product_image as "productImage",
          price,
          currency,
          quantity,
          status,
          customer_id as "customerId",
          customer_name as "customerName",
          customer_email as "customerEmail",
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        row.storeId,
        row.productId,
        row.productName.slice(0, 160),
        row.productImage?.slice(0, 2000) ?? null,
        row.price?.slice(0, 40) ?? null,
        row.currency?.slice(0, 12) ?? null,
        Math.max(1, Math.min(99, row.quantity)),
        row.customerId,
        row.customerName.slice(0, 120),
        row.customerEmail?.slice(0, 255) ?? null,
        row.note?.slice(0, 1000) ?? null,
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'BRAND_PRODUCT_ORDER_INSERT_FAILED',
        message: 'Failed to create brand product order',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'BRAND_PRODUCT_ORDER_ERROR',
      message: `Failed to save order: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getBrandProductOrdersByStore(
  storeId: number,
  limit: number = 100,
  offset: number = 0,
): Promise<BrandProductOrder[]> {
  try {
    await ensureBrandProductOrdersTable();

    return await queryMany<BrandProductOrder>(
      `
        SELECT
          o.id::int as "id",
          o.store_id::int as "storeId",
          o.product_id::int as "productId",
          o.product_name as "productName",
          COALESCE(
            NULLIF(TRIM(o.product_image), ''),
            NULLIF(TRIM(p.image_url), '')
          ) as "productImage",
          o.price,
          o.currency,
          o.quantity,
          o.status,
          o.customer_id as "customerId",
          o.customer_name as "customerName",
          COALESCE(o.customer_email, u.email) as "customerEmail",
          u.photo_url as "customerPhotoURL",
          o.note,
          o.created_at as "createdAt",
          o.updated_at as "updatedAt"
        FROM ${TABLE_NAME} o
        LEFT JOIN cosset_users u ON u.id::text = o.customer_id::text
        LEFT JOIN brand_products p ON p.id = o.product_id
        WHERE o.store_id = $1
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $2 OFFSET $3
      `,
      [storeId, Math.max(1, Math.min(300, limit)), Math.max(0, offset)],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'GET_BRAND_PRODUCT_ORDERS_ERROR',
      message: `Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateBrandProductOrderStatus(
  orderId: number,
  storeId: number,
  status: BrandProductOrderStatus,
): Promise<BrandProductOrder | null> {
  try {
    await ensureBrandProductOrdersTable();

    return await queryOne<BrandProductOrder>(
      `
        UPDATE ${TABLE_NAME}
        SET
          status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND store_id = $2
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          product_id::int as "productId",
          product_name as "productName",
          product_image as "productImage",
          price,
          currency,
          quantity,
          status,
          customer_id as "customerId",
          customer_name as "customerName",
          customer_email as "customerEmail",
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [orderId, storeId, status],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_BRAND_PRODUCT_ORDER_ERROR',
      message: `Failed to update order: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export type BrandProductOrderUpdate = {
  productId: number;
  productName: string;
  productImage?: string | null;
  price?: string | null;
  currency?: string | null;
  quantity: number;
  status?: BrandProductOrderStatus;
  customerId: string | null;
  customerName: string;
  customerEmail?: string | null;
  note?: string | null;
};

export async function updateBrandProductOrder(
  orderId: number,
  storeId: number,
  row: BrandProductOrderUpdate,
): Promise<BrandProductOrder | null> {
  try {
    await ensureBrandProductOrdersTable();

    return await queryOne<BrandProductOrder>(
      `
        UPDATE ${TABLE_NAME}
        SET
          product_id = $3,
          product_name = $4,
          product_image = $5,
          price = $6,
          currency = $7,
          quantity = $8,
          status = COALESCE($9, status),
          customer_id = $10,
          customer_name = $11,
          customer_email = $12,
          note = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND store_id = $2
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          product_id::int as "productId",
          product_name as "productName",
          product_image as "productImage",
          price,
          currency,
          quantity,
          status,
          customer_id as "customerId",
          customer_name as "customerName",
          customer_email as "customerEmail",
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        orderId,
        storeId,
        row.productId,
        row.productName.slice(0, 160),
        row.productImage?.slice(0, 2000) ?? null,
        row.price?.slice(0, 40) ?? null,
        row.currency?.slice(0, 12) ?? null,
        Math.max(1, Math.min(99, row.quantity)),
        row.status ?? null,
        row.customerId,
        row.customerName.slice(0, 120),
        row.customerEmail?.slice(0, 255) ?? null,
        row.note?.slice(0, 1000) ?? null,
      ],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_BRAND_PRODUCT_ORDER_ERROR',
      message: `Failed to update order: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteBrandProductOrder(
  orderId: number,
  storeId: number,
): Promise<BrandProductOrder | null> {
  try {
    await ensureBrandProductOrdersTable();

    return await queryOne<BrandProductOrder>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1 AND store_id = $2
        RETURNING
          id::int as "id",
          store_id::int as "storeId",
          product_id::int as "productId",
          product_name as "productName",
          product_image as "productImage",
          price,
          currency,
          quantity,
          status,
          customer_id as "customerId",
          customer_name as "customerName",
          customer_email as "customerEmail",
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [orderId, storeId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'DELETE_BRAND_PRODUCT_ORDER_ERROR',
      message: `Failed to delete order: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
