import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

export type BillingProvider = 'stripe' | 'paypal';

export interface CustomerBillingAccount {
  id: number;
  customerId: string;
  billingProvider: BillingProvider;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  planCurrentPeriodEnd?: Date | string | null;
  paypalPayerId?: string | null;
  paypalSubscriptionId?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export type CustomerBillingAccountInsert = {
  customerId: string;
  billingProvider: BillingProvider;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  planCurrentPeriodEnd?: Date | string | null;
  paypalPayerId?: string | null;
  paypalSubscriptionId?: string | null;
};

const TABLE_NAME = 'customer_billing_accounts';
const USERS_TABLE_NAME = 'cosset_users';

const SELECT_COLUMNS = `
  id,
  customer_id as "customerId",
  billing_provider as "billingProvider",
  stripe_customer_id as "stripeCustomerId",
  stripe_subscription_id as "stripeSubscriptionId",
  stripe_price_id as "stripePriceId",
  plan_current_period_end as "planCurrentPeriodEnd",
  paypal_payer_id as "paypalPayerId",
  paypal_subscription_id as "paypalSubscriptionId",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const LEGACY_COLUMNS = [
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'plan_current_period_end',
  'billing_provider',
  'paypal_payer_id',
  'paypal_subscription_id',
];

let ensureTablePromise: Promise<void> | null = null;

const toNullableText = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized.length ? normalized : null;
};

const toNullableDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

async function legacyBillingColumnsExist(): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = ANY($2::text[])
      ) AS "exists"
    `,
    [USERS_TABLE_NAME, LEGACY_COLUMNS],
  );

  return Boolean(result?.exists);
}

export async function ensureCustomerBillingAccountsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id BIGSERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          billing_provider VARCHAR(32) NOT NULL,
          stripe_customer_id VARCHAR(255) NULL,
          stripe_subscription_id VARCHAR(255) NULL,
          stripe_price_id VARCHAR(255) NULL,
          plan_current_period_end TIMESTAMP NULL,
          paypal_payer_id VARCHAR(255) NULL,
          paypal_subscription_id VARCHAR(255) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS plan_current_period_end TIMESTAMP NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS paypal_payer_id VARCHAR(255) NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255) NULL`,
      );

      await executeQuery(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_accounts_customer_provider
         ON ${TABLE_NAME} (customer_id, billing_provider)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_billing_accounts_stripe_customer
         ON ${TABLE_NAME} (stripe_customer_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_billing_accounts_stripe_subscription
         ON ${TABLE_NAME} (stripe_subscription_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_billing_accounts_paypal_payer
         ON ${TABLE_NAME} (paypal_payer_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_billing_accounts_paypal_subscription
         ON ${TABLE_NAME} (paypal_subscription_id)`,
      );

      if (await legacyBillingColumnsExist()) {
        await executeQuery(
          `
            INSERT INTO ${TABLE_NAME} (
              customer_id,
              billing_provider,
              stripe_customer_id,
              stripe_subscription_id,
              stripe_price_id,
              plan_current_period_end,
              paypal_payer_id,
              paypal_subscription_id,
              created_at,
              updated_at
            )
            SELECT
              id::text AS customer_id,
              COALESCE(
                NULLIF(LOWER(billing_provider), ''),
                CASE
                  WHEN stripe_customer_id IS NOT NULL
                    OR stripe_subscription_id IS NOT NULL
                    OR stripe_price_id IS NOT NULL
                    OR plan_current_period_end IS NOT NULL
                  THEN 'stripe'
                  WHEN paypal_payer_id IS NOT NULL
                    OR paypal_subscription_id IS NOT NULL
                  THEN 'paypal'
                  ELSE NULL
                END
              ) AS billing_provider,
              stripe_customer_id,
              stripe_subscription_id,
              stripe_price_id,
              plan_current_period_end,
              paypal_payer_id,
              paypal_subscription_id,
              COALESCE(updated_at, created_at, NOW()) AS created_at,
              COALESCE(updated_at, created_at, NOW()) AS updated_at
            FROM ${USERS_TABLE_NAME}
            WHERE
              stripe_customer_id IS NOT NULL
              OR stripe_subscription_id IS NOT NULL
              OR stripe_price_id IS NOT NULL
              OR plan_current_period_end IS NOT NULL
              OR paypal_payer_id IS NOT NULL
              OR paypal_subscription_id IS NOT NULL
              OR billing_provider IS NOT NULL
            ON CONFLICT (customer_id, billing_provider) DO UPDATE SET
              stripe_customer_id = EXCLUDED.stripe_customer_id,
              stripe_subscription_id = EXCLUDED.stripe_subscription_id,
              stripe_price_id = EXCLUDED.stripe_price_id,
              plan_current_period_end = EXCLUDED.plan_current_period_end,
              paypal_payer_id = EXCLUDED.paypal_payer_id,
              paypal_subscription_id = EXCLUDED.paypal_subscription_id,
              updated_at = NOW()
          `,
        );

        await Promise.all(
          LEGACY_COLUMNS.map((column) =>
            executeQuery(`ALTER TABLE ${USERS_TABLE_NAME} DROP COLUMN IF EXISTS ${column}`),
          ),
        );
      }
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function upsertCustomerBillingAccount(
  row: CustomerBillingAccountInsert,
): Promise<CustomerBillingAccount> {
  try {
    await ensureCustomerBillingAccountsTable();

    const saved = await queryOne<CustomerBillingAccount>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          billing_provider,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_price_id,
          plan_current_period_end,
          paypal_payer_id,
          paypal_subscription_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (customer_id, billing_provider) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          stripe_price_id = EXCLUDED.stripe_price_id,
          plan_current_period_end = EXCLUDED.plan_current_period_end,
          paypal_payer_id = EXCLUDED.paypal_payer_id,
          paypal_subscription_id = EXCLUDED.paypal_subscription_id,
          updated_at = NOW()
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        row.customerId,
        row.billingProvider,
        toNullableText(row.stripeCustomerId),
        toNullableText(row.stripeSubscriptionId),
        toNullableText(row.stripePriceId),
        toNullableDate(row.planCurrentPeriodEnd),
        toNullableText(row.paypalPayerId),
        toNullableText(row.paypalSubscriptionId),
      ],
    );

    if (!saved) {
      throw new DatabaseError({
        code: 'UPSERT_CUSTOMER_BILLING_ACCOUNT_FAILED',
        message: 'Failed to save customer billing account',
      });
    }

    return saved;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError({
      code: 'UPSERT_CUSTOMER_BILLING_ACCOUNT_ERROR',
      message: `Failed to upsert customer billing account: ${(error as Error).message}`,
    });
  }
}

export async function getCustomerBillingAccount(
  customerId: string,
  billingProvider: BillingProvider,
): Promise<CustomerBillingAccount | null> {
  await ensureCustomerBillingAccountsTable();
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) {
    return null;
  }

  return queryOne<CustomerBillingAccount>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE customer_id = $1 AND billing_provider = $2
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [normalizedCustomerId, billingProvider],
  );
}

export async function getBillingAccountByProviderCustomerId(
  billingProvider: BillingProvider,
  providerCustomerId: string,
): Promise<CustomerBillingAccount | null> {
  await ensureCustomerBillingAccountsTable();
  const normalizedProviderCustomerId = String(providerCustomerId || '').trim();
  if (!normalizedProviderCustomerId) {
    return null;
  }

  const column = billingProvider === 'stripe' ? 'stripe_customer_id' : 'paypal_payer_id';

  return queryOne<CustomerBillingAccount>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE billing_provider = $1
        AND ${column} = $2
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [billingProvider, normalizedProviderCustomerId],
  );
}

export async function listCustomerBillingAccounts(
  customerId: string,
): Promise<CustomerBillingAccount[]> {
  await ensureCustomerBillingAccountsTable();
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) {
    return [];
  }

  return queryMany<CustomerBillingAccount>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE customer_id = $1
      ORDER BY updated_at DESC, id DESC
    `,
    [normalizedCustomerId],
  );
}
