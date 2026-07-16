import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

const TABLE_NAME = 'coffee_shop_orders';

let ensureTablePromise: Promise<void> | null = null;

const ensureCoffeeShopOrdersTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            coffee_shop_id INT NOT NULL,
            customer_id UUID NULL,
            customer_name VARCHAR(100) NULL,
            menu_item_id VARCHAR(64) NOT NULL,
            menu_item_name VARCHAR(100) NOT NULL,
            menu_item_image TEXT NULL,
            quantity INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export type CoffeeShopOrderInsert = {
  coffeeShopId: number;
  customerId: string | null;
  customerName: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImage: string | null;
  quantity: number;
};

export async function createCoffeeShopOrder(row: CoffeeShopOrderInsert): Promise<{ id: string }> {
  try {
    await ensureCoffeeShopOrdersTable();

    const inserted = await queryOne<{ id: string }>(
      `
        INSERT INTO ${TABLE_NAME} (
          coffee_shop_id,
          customer_id,
          customer_name,
          menu_item_id,
          menu_item_name,
          menu_item_image,
          quantity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id::text AS id
      `,
      [
        row.coffeeShopId,
        row.customerId,
        row.customerName.slice(0, 100),
        row.menuItemId.slice(0, 64),
        row.menuItemName.slice(0, 100),
        row.menuItemImage?.slice(0, 1000) ?? null,
        Math.max(1, Math.min(99, row.quantity)),
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'COFFEE_SHOP_ORDER_INSERT_FAILED',
        message: 'Failed to create coffee shop order',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_ORDER_ERROR',
      message: `Failed to save order: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
