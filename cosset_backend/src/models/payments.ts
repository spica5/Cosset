import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { updateUserPlan, type UserPlanType } from './users';
import {
  getCustomerBillingAccount,
  upsertCustomerBillingAccount,
  getBillingAccountByProviderCustomerId,
} from './customer-billing-accounts';

const TABLE_NAME = 'customer_payments';

export type PaymentProvider = 'stripe' | 'paypal';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'active';

export type PaidPlanType = Exclude<UserPlanType, 'FREE'>;

export interface CustomerPayment {
  id: number;
  customerId: string;
  provider: PaymentProvider;
  plan: PaidPlanType | 'FREE' | string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  providerCustomerId?: string | null;
  priceId?: string | null;
  externalCheckoutId?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export type CustomerBillingSummary = {
  plan: UserPlanType;
  provider: PaymentProvider | null;
  providerCustomerId: string | null;
  externalSubscriptionId: string | null;
  priceId: string | null;
  currentPeriodEnd: Date | string | null;
  status: PaymentStatus | null;
  payment: CustomerPayment | null;
};

export type CustomerPaymentInsert = {
  customerId: string;
  provider: PaymentProvider;
  plan: string;
  amountCents: number;
  currency?: string;
  status?: PaymentStatus;
  providerCustomerId?: string | null;
  priceId?: string | null;
  externalCheckoutId?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

export type CustomerPaymentUpdate = Partial<Omit<CustomerPaymentInsert, 'customerId' | 'provider'>> & {
  status?: PaymentStatus;
};

const SELECT_COLUMNS = `
  id,
  customer_id as "customerId",
  provider,
  plan,
  amount_cents as "amountCents",
  currency,
  status,
  provider_customer_id as "providerCustomerId",
  price_id as "priceId",
  external_checkout_id as "externalCheckoutId",
  external_payment_id as "externalPaymentId",
  external_subscription_id as "externalSubscriptionId",
  current_period_end as "currentPeriodEnd",
  metadata,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

let ensureTablePromise: Promise<void> | null = null;

export const ensureCustomerPaymentsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            provider VARCHAR(32) NOT NULL,
            plan VARCHAR(32) NOT NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            currency VARCHAR(12) NOT NULL DEFAULT 'usd',
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            provider_customer_id VARCHAR(255) NULL,
            price_id VARCHAR(255) NULL,
            external_checkout_id VARCHAR(255) NULL,
            external_payment_id VARCHAR(255) NULL,
            external_subscription_id VARCHAR(255) NULL,
            current_period_end TIMESTAMP NULL,
            metadata JSONB NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS price_id VARCHAR(255) NULL`,
      );
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP NULL`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_payments_customer
         ON ${TABLE_NAME} (customer_id, created_at DESC, id DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_payments_provider
         ON ${TABLE_NAME} (provider, status, created_at DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_payments_checkout
         ON ${TABLE_NAME} (external_checkout_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_payments_subscription
         ON ${TABLE_NAME} (external_subscription_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_customer_payments_provider_customer
         ON ${TABLE_NAME} (provider, provider_customer_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const toPeriodEndValue = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export async function createCustomerPayment(
  row: CustomerPaymentInsert,
): Promise<CustomerPayment> {
  try {
    await ensureCustomerPaymentsTable();

    const inserted = await queryOne<CustomerPayment>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          provider,
          plan,
          amount_cents,
          currency,
          status,
          provider_customer_id,
          price_id,
          external_checkout_id,
          external_payment_id,
          external_subscription_id,
          current_period_end,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        row.customerId,
        row.provider,
        row.plan,
        row.amountCents,
        row.currency || 'usd',
        row.status || 'pending',
        row.providerCustomerId || null,
        row.priceId || null,
        row.externalCheckoutId || null,
        row.externalPaymentId || null,
        row.externalSubscriptionId || null,
        toPeriodEndValue(row.currentPeriodEnd),
        row.metadata ? JSON.stringify(row.metadata) : null,
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'CREATE_CUSTOMER_PAYMENT_FAILED',
        message: 'Failed to create customer payment',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CREATE_CUSTOMER_PAYMENT_ERROR',
      message: `Failed to create customer payment: ${(error as Error).message}`,
    });
  }
}

export async function updateCustomerPayment(
  id: number,
  updates: CustomerPaymentUpdate,
): Promise<CustomerPayment | null> {
  try {
    await ensureCustomerPaymentsTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 2;
    const next = () => {
      const current = paramIndex;
      paramIndex += 1;
      return current;
    };

    if (updates.plan !== undefined) {
      fields.push(`plan = $${next()}`);
      values.push(updates.plan);
    }
    if (updates.amountCents !== undefined) {
      fields.push(`amount_cents = $${next()}`);
      values.push(updates.amountCents);
    }
    if (updates.currency !== undefined) {
      fields.push(`currency = $${next()}`);
      values.push(updates.currency);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${next()}`);
      values.push(updates.status);
    }
    if (updates.providerCustomerId !== undefined) {
      fields.push(`provider_customer_id = $${next()}`);
      values.push(updates.providerCustomerId);
    }
    if (updates.priceId !== undefined) {
      fields.push(`price_id = $${next()}`);
      values.push(updates.priceId);
    }
    if (updates.externalCheckoutId !== undefined) {
      fields.push(`external_checkout_id = $${next()}`);
      values.push(updates.externalCheckoutId);
    }
    if (updates.externalPaymentId !== undefined) {
      fields.push(`external_payment_id = $${next()}`);
      values.push(updates.externalPaymentId);
    }
    if (updates.externalSubscriptionId !== undefined) {
      fields.push(`external_subscription_id = $${next()}`);
      values.push(updates.externalSubscriptionId);
    }
    if (updates.currentPeriodEnd !== undefined) {
      fields.push(`current_period_end = $${next()}`);
      values.push(toPeriodEndValue(updates.currentPeriodEnd));
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${next()}::jsonb`);
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (!fields.length) {
      return await queryOne<CustomerPayment>(
        `SELECT ${SELECT_COLUMNS} FROM ${TABLE_NAME} WHERE id = $1`,
        [id],
      );
    }

    fields.push('updated_at = NOW()');

    return await queryOne<CustomerPayment>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING ${SELECT_COLUMNS}
      `,
      [id, ...values],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_CUSTOMER_PAYMENT_ERROR',
      message: `Failed to update customer payment: ${(error as Error).message}`,
    });
  }
}

export async function getCustomerPaymentByCheckoutId(
  provider: PaymentProvider,
  externalCheckoutId: string,
): Promise<CustomerPayment | null> {
  await ensureCustomerPaymentsTable();
  const checkoutId = String(externalCheckoutId || '').trim();
  if (!checkoutId) {
    return null;
  }

  return queryOne<CustomerPayment>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE provider = $1 AND external_checkout_id = $2
      ORDER BY id DESC
      LIMIT 1
    `,
    [provider, checkoutId],
  );
}

export async function getCustomerPaymentBySubscriptionId(
  provider: PaymentProvider,
  externalSubscriptionId: string,
): Promise<CustomerPayment | null> {
  await ensureCustomerPaymentsTable();
  const subscriptionId = String(externalSubscriptionId || '').trim();
  if (!subscriptionId) {
    return null;
  }

  return queryOne<CustomerPayment>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE provider = $1 AND external_subscription_id = $2
      ORDER BY id DESC
      LIMIT 1
    `,
    [provider, subscriptionId],
  );
}

export async function getCustomerPaymentByProviderCustomerId(
  provider: PaymentProvider,
  providerCustomerId: string,
): Promise<CustomerPayment | null> {
  await ensureCustomerPaymentsTable();
  const normalized = String(providerCustomerId || '').trim();
  if (!normalized) {
    return null;
  }

  const billingAccount = await getBillingAccountByProviderCustomerId(provider, normalized);
  if (billingAccount) {
    const paymentByCustomerId = await queryOne<CustomerPayment>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
          AND provider = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [billingAccount.customerId, provider],
    );

    if (paymentByCustomerId) {
      return paymentByCustomerId;
    }
  }

  return queryOne<CustomerPayment>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE provider = $1 AND provider_customer_id = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [provider, normalized],
  );
}

export async function getActiveCustomerPayment(
  customerId: string,
): Promise<CustomerPayment | null> {
  await ensureCustomerPaymentsTable();
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) {
    return null;
  }

  return queryOne<CustomerPayment>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE customer_id = $1
        AND status IN ('active', 'completed')
        AND COALESCE(plan, 'FREE') <> 'FREE'
        AND external_subscription_id IS NOT NULL
      ORDER BY
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        created_at DESC,
        id DESC
      LIMIT 1
    `,
    [normalizedCustomerId],
  );
}

export async function getLatestProviderCustomerId(
  customerId: string,
  provider: PaymentProvider,
): Promise<string | null> {
  await ensureCustomerPaymentsTable();
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) {
    return null;
  }

  const billingAccount = await getCustomerBillingAccount(normalizedCustomerId, provider);
  if (billingAccount) {
    return provider === 'stripe'
      ? billingAccount.stripeCustomerId || null
      : billingAccount.paypalPayerId || null;
  }

  const row = await queryOne<{ providerCustomerId?: string | null }>(
    `
      SELECT provider_customer_id as "providerCustomerId"
      FROM ${TABLE_NAME}
      WHERE customer_id = $1
        AND provider = $2
        AND provider_customer_id IS NOT NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [normalizedCustomerId, provider],
  );

  return row?.providerCustomerId || null;
}

export async function getCustomerBillingSummary(
  customerId: string,
): Promise<CustomerBillingSummary> {
  const payment = await getActiveCustomerPayment(customerId);
  const plan = String(payment?.plan || 'FREE').toUpperCase() as UserPlanType;
  const normalizedPlan: UserPlanType =
    plan === 'PAID' || plan === 'EXTRA-PAID' ? plan : 'FREE';

  const provider = payment?.provider || null;
  const billingAccount = provider ? await getCustomerBillingAccount(customerId, provider) : null;
  const providerCustomerId =
    payment?.providerCustomerId ||
    (provider
      ? provider === 'stripe'
        ? billingAccount?.stripeCustomerId || null
        : billingAccount?.paypalPayerId || null
      : null) ||
    (provider ? await getLatestProviderCustomerId(customerId, provider) : null);

  return {
    plan: normalizedPlan,
    provider,
    providerCustomerId,
    externalSubscriptionId: payment?.externalSubscriptionId || null,
    priceId: payment?.priceId || null,
    currentPeriodEnd: payment?.currentPeriodEnd || null,
    status: payment?.status || null,
    payment,
  };
}

export async function listCustomerPayments(
  customerId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<CustomerPayment[]> {
  await ensureCustomerPaymentsTable();
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) {
    return [];
  }

  return queryMany<CustomerPayment>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE customer_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `,
    [normalizedCustomerId, limit, offset],
  );
}

export async function upsertCustomerPaymentByCheckout(params: {
  customerId: string;
  provider: PaymentProvider;
  plan: string;
  amountCents: number;
  currency?: string;
  status: PaymentStatus;
  providerCustomerId?: string | null;
  priceId?: string | null;
  externalCheckoutId?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CustomerPayment> {
  let existing: CustomerPayment | null = null;

  if (params.externalCheckoutId) {
    existing = await getCustomerPaymentByCheckoutId(params.provider, params.externalCheckoutId);
  }

  if (!existing && params.externalSubscriptionId) {
    existing = await getCustomerPaymentBySubscriptionId(
      params.provider,
      params.externalSubscriptionId,
    );
  }

  if (existing) {
    const updated = await updateCustomerPayment(existing.id, {
      plan: params.plan,
      amountCents: params.amountCents,
      currency: params.currency,
      status: params.status,
      providerCustomerId: params.providerCustomerId,
      priceId: params.priceId,
      externalCheckoutId: params.externalCheckoutId ?? existing.externalCheckoutId,
      externalPaymentId: params.externalPaymentId,
      externalSubscriptionId: params.externalSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd,
      metadata: params.metadata,
    });
    return updated || existing;
  }

  return createCustomerPayment(params);
}

/** Persist billing on payments table and sync the user's plan flag only. */
export async function syncCustomerBilling(params: {
  customerId: string;
  provider: PaymentProvider;
  plan: UserPlanType;
  amountCents: number;
  currency?: string;
  status: PaymentStatus;
  providerCustomerId?: string | null;
  priceId?: string | null;
  externalCheckoutId?: string | null;
  externalPaymentId?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodEnd?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CustomerPayment> {
  const payment = await upsertCustomerPaymentByCheckout({
    ...params,
    plan: params.plan,
  });

  await upsertCustomerBillingAccount({
    customerId: params.customerId,
    billingProvider: params.provider,
    stripeCustomerId: params.provider === 'stripe' ? params.providerCustomerId || null : null,
    stripeSubscriptionId:
      params.provider === 'stripe' ? params.externalSubscriptionId || null : null,
    stripePriceId: params.provider === 'stripe' ? params.priceId || null : null,
    planCurrentPeriodEnd: params.currentPeriodEnd || null,
    paypalPayerId: params.provider === 'paypal' ? params.providerCustomerId || null : null,
    paypalSubscriptionId:
      params.provider === 'paypal' ? params.externalSubscriptionId || null : null,
  });

  const nextPlan: UserPlanType =
    params.status === 'active' || params.status === 'completed'
      ? params.plan === 'PAID' || params.plan === 'EXTRA-PAID'
        ? params.plan
        : 'FREE'
      : 'FREE';

  await updateUserPlan(params.customerId, nextPlan);
  return payment;
}
