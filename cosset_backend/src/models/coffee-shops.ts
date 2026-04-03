import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'coffee_shops';

export interface CoffeeShop {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  type?: number | null;
  background?: string | null;
  files?: string | null;
  createdAt?: Date | null;
}

let ensureCoffeeShopsTablePromise: Promise<void> | null = null;

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeNullableInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseInteger(value);
};

const ensureCoffeeShopsTable = async (): Promise<void> => {
  if (!ensureCoffeeShopsTablePromise) {
    ensureCoffeeShopsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(50),
            title VARCHAR(255),
            description TEXT,
            type SMALLINT,
            background TEXT,
            files TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
    })().catch((error) => {
      ensureCoffeeShopsTablePromise = null;
      throw error;
    });
  }

  await ensureCoffeeShopsTablePromise;
};

export async function getAllCoffeeShops(
  limit: number = 100,
  offset: number = 0,
): Promise<CoffeeShop[]> {
  try {
    await ensureCoffeeShopsTable();

    const normalizedLimit = Math.max(1, Math.min(300, parseInteger(limit) ?? 100));
    const normalizedOffset = Math.max(0, parseInteger(offset) ?? 0);

    return await queryMany<CoffeeShop>(
      `
        SELECT
          id,
          name,
          title,
          description,
          type,
          background,
          files,
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
      [normalizedLimit, normalizedOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COFFEE_SHOPS_ERROR',
        message: `Failed to fetch coffee shops: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getCoffeeShopById(id: number): Promise<CoffeeShop | null> {
  try {
    await ensureCoffeeShopsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_COFFEE_SHOP_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<CoffeeShop>(
      `
        SELECT
          id,
          name,
          title,
          description,
          type,
          background,
          files,
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COFFEE_SHOP_ERROR',
        message: `Failed to fetch coffee shop: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createCoffeeShop(
  coffeeShop: Omit<CoffeeShop, 'id' | 'createdAt'>,
): Promise<CoffeeShop> {
  try {
    await ensureCoffeeShopsTable();

    const created = await queryOne<CoffeeShop>(
      `
        INSERT INTO ${TABLE_NAME} (
          name,
          title,
          description,
          type,
          background,
          files,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING
          id,
          name,
          title,
          description,
          type,
          background,
          files,
          created_at as "createdAt"
      `,
      [
        coffeeShop.name,
        coffeeShop.title ?? null,
        coffeeShop.description ?? null,
        normalizeNullableInteger(coffeeShop.type),
        coffeeShop.background ?? null,
        coffeeShop.files ?? null,
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_COFFEE_SHOP_FAILED',
        message: 'Failed to create coffee shop',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_COFFEE_SHOP_ERROR',
        message: `Failed to create coffee shop: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updateCoffeeShop(
  id: number,
  updates: Partial<Omit<CoffeeShop, 'id' | 'createdAt'>>,
): Promise<CoffeeShop> {
  try {
    await ensureCoffeeShopsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_COFFEE_SHOP_ID',
        message: 'id must be a valid integer',
      });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex += 1;
    }

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title ?? null);
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(normalizeNullableInteger(updates.type));
      paramIndex += 1;
    }

    if (updates.background !== undefined) {
      fields.push(`background = $${paramIndex}`);
      values.push(updates.background ?? null);
      paramIndex += 1;
    }

    if (updates.files !== undefined) {
      fields.push(`files = $${paramIndex}`);
      values.push(updates.files ?? null);
      paramIndex += 1;
    }

    if (!fields.length) {
      const existing = await getCoffeeShopById(normalizedId);
      if (!existing) {
        throw new DatabaseError({
          code: 'COFFEE_SHOP_NOT_FOUND',
          message: 'Coffee shop not found',
        });
      }

      return existing;
    }

    values.push(normalizedId);

    const updated = await queryOne<CoffeeShop>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          name,
          title,
          description,
          type,
          background,
          files,
          created_at as "createdAt"
      `,
      values,
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'COFFEE_SHOP_NOT_FOUND',
        message: 'Coffee shop not found',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_COFFEE_SHOP_ERROR',
        message: `Failed to update coffee shop: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deleteCoffeeShop(id: number): Promise<boolean> {
  try {
    await ensureCoffeeShopsTable();

    const normalizedId = parseInteger(id);

    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_COFFEE_SHOP_ID',
        message: 'id must be a valid integer',
      });
    }

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [normalizedId],
    );

    return !!deleted?.id;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_COFFEE_SHOP_ERROR',
        message: `Failed to delete coffee shop: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
