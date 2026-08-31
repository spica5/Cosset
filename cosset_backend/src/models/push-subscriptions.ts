import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'push_subscriptions';

export type PushSubscriptionRecord = {
  id: number;
  customerId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  origin: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

let ensureTablePromise: Promise<void> | null = null;

const ensurePushSubscriptionsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            customer_id UUID NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            origin TEXT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint),
            CONSTRAINT fk_push_subscriptions_customer
              FOREIGN KEY (customer_id) REFERENCES cosset_users(id) ON DELETE CASCADE
          )
        `,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS origin TEXT NULL`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer_enabled
          ON ${TABLE_NAME} (customer_id, enabled)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer_origin
          ON ${TABLE_NAME} (customer_id, origin)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const subscriptionSelect = `
  id,
  customer_id as "customerId",
  endpoint,
  p256dh,
  auth,
  origin,
  enabled,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function upsertPushSubscription(input: {
  customerId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  origin?: string | null;
  replaceOtherOrigins?: boolean;
}): Promise<PushSubscriptionRecord> {
  try {
    await ensurePushSubscriptionsTable();

    const origin = (input.origin || '').trim() || null;

    const row = await queryOne<PushSubscriptionRecord>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id, endpoint, p256dh, auth, origin, enabled, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
        ON CONFLICT (endpoint)
        DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          origin = COALESCE(EXCLUDED.origin, ${TABLE_NAME}.origin),
          enabled = TRUE,
          updated_at = NOW()
        RETURNING
          ${subscriptionSelect}
      `,
      [input.customerId, input.endpoint, input.p256dh, input.auth, origin],
    );

    if (!row) {
      throw new DatabaseError({
        code: 'UPSERT_PUSH_SUBSCRIPTION_FAILED',
        message: 'Failed to save push subscription',
      });
    }

    // Keep only this site's subscriptions so localhost test endpoints don't steal alerts.
    if (input.replaceOtherOrigins !== false && origin) {
      await executeQuery(
        `
          DELETE FROM ${TABLE_NAME}
          WHERE customer_id = $1
            AND endpoint <> $2
            AND (
              origin IS NULL
              OR origin <> $3
            )
        `,
        [input.customerId, input.endpoint, origin],
      );
    }

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'UPSERT_PUSH_SUBSCRIPTION_ERROR',
      message: `Failed to save push subscription: ${message}`,
    });
  }
}

export async function setPushSubscriptionsEnabled(
  customerId: string,
  enabled: boolean,
): Promise<number> {
  try {
    await ensurePushSubscriptionsTable();

    const result = await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET enabled = $2, updated_at = NOW()
        WHERE customer_id = $1
      `,
      [customerId, enabled],
    );

    return result.rowCount;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'SET_PUSH_SUBSCRIPTIONS_ENABLED_ERROR',
      message: `Failed to update push subscriptions: ${message}`,
    });
  }
}

export async function deletePushSubscription(
  customerId: string,
  endpoint?: string,
): Promise<number> {
  try {
    await ensurePushSubscriptionsTable();

    if (endpoint) {
      const result = await executeQuery(
        `
          DELETE FROM ${TABLE_NAME}
          WHERE customer_id = $1 AND endpoint = $2
        `,
        [customerId, endpoint],
      );
      return result.rowCount;
    }

    const result = await executeQuery(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE customer_id = $1
      `,
      [customerId],
    );
    return result.rowCount;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'DELETE_PUSH_SUBSCRIPTION_ERROR',
      message: `Failed to delete push subscription: ${message}`,
    });
  }
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  try {
    await ensurePushSubscriptionsTable();
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE endpoint = $1`, [endpoint]);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'DELETE_PUSH_SUBSCRIPTION_BY_ENDPOINT_ERROR',
      message: `Failed to delete push subscription: ${message}`,
    });
  }
}

export async function listEnabledPushSubscriptionsForUser(
  customerId: string,
): Promise<PushSubscriptionRecord[]> {
  try {
    await ensurePushSubscriptionsTable();

    return await queryMany<PushSubscriptionRecord>(
      `
        SELECT
          ${subscriptionSelect}
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
          AND enabled = TRUE
      `,
      [customerId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'LIST_PUSH_SUBSCRIPTIONS_ERROR',
      message: `Failed to list push subscriptions: ${message}`,
    });
  }
}

export async function hasEnabledPushSubscription(customerId: string): Promise<boolean> {
  try {
    await ensurePushSubscriptionsTable();

    const row = await queryOne<{ id: number }>(
      `
        SELECT id
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
          AND enabled = TRUE
        LIMIT 1
      `,
      [customerId],
    );

    return !!row;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'HAS_PUSH_SUBSCRIPTION_ERROR',
      message: `Failed to check push subscription: ${message}`,
    });
  }
}

export async function hasEnabledPushSubscriptionForOrigin(
  customerId: string,
  origin: string,
): Promise<boolean> {
  try {
    await ensurePushSubscriptionsTable();

    const normalized = origin.trim();
    if (!normalized) return await hasEnabledPushSubscription(customerId);

    const row = await queryOne<{ id: number }>(
      `
        SELECT id
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
          AND enabled = TRUE
          AND origin = $2
        LIMIT 1
      `,
      [customerId, normalized],
    );

    return !!row;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'HAS_PUSH_SUBSCRIPTION_ORIGIN_ERROR',
      message: `Failed to check push subscription for origin: ${message}`,
    });
  }
}

export async function listAllEnabledPushCustomerIds(): Promise<string[]> {
  try {
    await ensurePushSubscriptionsTable();

    const rows = await queryMany<{ customerId: string }>(
      `
        SELECT DISTINCT customer_id as "customerId"
        FROM ${TABLE_NAME}
        WHERE enabled = TRUE
      `,
    );

    return rows.map((row) => row.customerId).filter(Boolean);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'LIST_PUSH_CUSTOMERS_ERROR',
      message: `Failed to list push customers: ${message}`,
    });
  }
}
