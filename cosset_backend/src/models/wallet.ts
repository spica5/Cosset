import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import { getUserById, type UserPlanType } from './users';
import { getCinemaFilmById } from './cinema-films';
import { getCinemaFilmScreeningById } from './cinema-film-screenings';

const WALLETS_TABLE = 'user_wallets';
const LEDGER_TABLE = 'user_wallet_ledger';

export const WALLET_CURRENCY = 'usd';
export const MIN_TOPUP_CENTS = 100;
export const MAX_TOPUP_CENTS = 20_000;
export const MAX_SERVICE_CHARGE_CENTS = 10_000;

export type WalletLedgerKind = 'topup' | 'cinema_watch' | 'refund';

export type WalletRow = {
  id: number;
  customerId: string;
  balanceCents: number;
  currency: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type WalletLedgerRow = {
  id: number;
  customerId: string;
  deltaCents: number;
  balanceAfterCents: number;
  kind: WalletLedgerKind;
  status: string;
  description?: string | null;
  refType?: string | null;
  refId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
};

export type CinemaWatchQuote = {
  screeningId: number;
  filmId: number;
  filmTitle: string;
  pricingType: 'free' | 'paid';
  baseFeeCents: number;
  chargeCents: number;
  discounted: boolean;
};

let ensureTablesPromise: Promise<void> | null = null;

const WALLET_COLUMNS = `
  id,
  customer_id as "customerId",
  balance_cents as "balanceCents",
  currency,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const LEDGER_COLUMNS = `
  id,
  customer_id as "customerId",
  delta_cents as "deltaCents",
  balance_after_cents as "balanceAfterCents",
  kind,
  status,
  description,
  ref_type as "refType",
  ref_id as "refId",
  metadata,
  created_at as "createdAt"
`;

const isDuplicateKey = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message = error instanceof Error ? error.message : String(error);
  return code === '23505' || /duplicate key/i.test(message);
};

export async function ensureWalletTables(): Promise<void> {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${WALLETS_TABLE} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL UNIQUE,
            balance_cents INT NOT NULL DEFAULT 0,
            currency VARCHAR(8) NOT NULL DEFAULT 'usd',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            delta_cents INT NOT NULL,
            balance_after_cents INT NOT NULL,
            kind VARCHAR(40) NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'completed',
            description TEXT,
            ref_type VARCHAR(40),
            ref_id VARCHAR(255),
            metadata JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_wallets_customer ON ${WALLETS_TABLE} (customer_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_wallet_ledger_customer ON ${LEDGER_TABLE} (customer_id, created_at DESC)`,
      );
      await executeQuery(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wallet_ledger_ref
          ON ${LEDGER_TABLE} (ref_type, ref_id)
          WHERE ref_id IS NOT NULL AND ref_id <> ''
        `,
      );
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }

  await ensureTablesPromise;
}

export function screeningPriceToCents(price?: string | number | null): number {
  const parsed = Number.parseFloat(String(price ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(parsed * 100));
}

export async function getWalletByCustomerId(customerId: string): Promise<WalletRow | null> {
  const id = String(customerId || '').trim();
  if (!id) return null;

  await ensureWalletTables();

  return queryOne<WalletRow>(
    `
      SELECT ${WALLET_COLUMNS}
      FROM ${WALLETS_TABLE}
      WHERE customer_id = $1
      LIMIT 1
    `,
    [id],
  );
}

export async function ensureWallet(customerId: string): Promise<WalletRow> {
  const id = String(customerId || '').trim();
  if (!id) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_CUSTOMER',
      message: 'customerId is required',
    });
  }

  await ensureWalletTables();

  const existing = await getWalletByCustomerId(id);
  if (existing) return existing;

  const created = await queryOne<WalletRow>(
    `
      INSERT INTO ${WALLETS_TABLE} (customer_id, balance_cents, currency)
      VALUES ($1, 0, $2)
      ON CONFLICT (customer_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
      RETURNING ${WALLET_COLUMNS}
    `,
    [id, WALLET_CURRENCY],
  );

  if (!created) {
    throw new DatabaseError({
      code: 'WALLET_CREATE_FAILED',
      message: 'Failed to create wallet',
    });
  }

  return created;
}

export async function listWalletLedger(
  customerId: string,
  limit = 20,
): Promise<WalletLedgerRow[]> {
  const id = String(customerId || '').trim();
  if (!id) return [];

  await ensureWalletTables();

  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit) || 20));

  return queryMany<WalletLedgerRow>(
    `
      SELECT ${LEDGER_COLUMNS}
      FROM ${LEDGER_TABLE}
      WHERE customer_id = $1
        AND status = 'completed'
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [id, safeLimit],
  );
}

export async function getLedgerByRef(
  refType: string,
  refId: string,
): Promise<WalletLedgerRow | null> {
  const type = String(refType || '').trim();
  const id = String(refId || '').trim();
  if (!type || !id) return null;

  await ensureWalletTables();

  return queryOne<WalletLedgerRow>(
    `
      SELECT ${LEDGER_COLUMNS}
      FROM ${LEDGER_TABLE}
      WHERE ref_type = $1 AND ref_id = $2
      LIMIT 1
    `,
    [type, id],
  );
}

async function insertLedgerAndReturn(input: {
  customerId: string;
  deltaCents: number;
  balanceAfterCents: number;
  kind: WalletLedgerKind;
  description: string;
  refType?: string | null;
  refId?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
}): Promise<WalletLedgerRow> {
  const inserted = await queryOne<WalletLedgerRow>(
    `
      INSERT INTO ${LEDGER_TABLE} (
        customer_id,
        delta_cents,
        balance_after_cents,
        kind,
        status,
        description,
        ref_type,
        ref_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING ${LEDGER_COLUMNS}
    `,
    [
      input.customerId,
      input.deltaCents,
      input.balanceAfterCents,
      input.kind,
      input.status || 'completed',
      input.description,
      input.refType || null,
      input.refId || null,
      JSON.stringify(input.metadata || {}),
    ],
  );

  if (!inserted) {
    throw new DatabaseError({
      code: 'WALLET_LEDGER_INSERT_FAILED',
      message: 'Failed to record wallet transaction',
    });
  }

  return inserted;
}

export async function creditWallet(input: {
  customerId: string;
  amountCents: number;
  kind: WalletLedgerKind;
  description: string;
  refType?: string | null;
  refId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ wallet: WalletRow; ledger: WalletLedgerRow; alreadyApplied: boolean }> {
  const customerId = String(input.customerId || '').trim();
  const amountCents = Math.trunc(input.amountCents);

  if (!customerId) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_CUSTOMER',
      message: 'customerId is required',
    });
  }

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_AMOUNT',
      message: 'Top-up amount must be greater than 0',
    });
  }

  await ensureWalletTables();
  await ensureWallet(customerId);

  if (input.refType && input.refId) {
    const existing = await getLedgerByRef(input.refType, input.refId);
    if (existing?.status === 'completed') {
      const wallet = await ensureWallet(customerId);
      return { wallet, ledger: existing, alreadyApplied: true };
    }

    if (!existing) {
      try {
        await insertLedgerAndReturn({
          customerId,
          deltaCents: amountCents,
          balanceAfterCents: 0,
          kind: input.kind,
          description: input.description,
          refType: input.refType,
          refId: input.refId,
          metadata: input.metadata,
          status: 'pending',
        });
      } catch (error) {
        if (!isDuplicateKey(error)) {
          throw error;
        }
      }
    }

    const claimed = await queryOne<WalletLedgerRow>(
      `
        UPDATE ${LEDGER_TABLE}
        SET status = 'processing'
        WHERE ref_type = $1
          AND ref_id = $2
          AND status IN ('pending', 'processing')
        RETURNING ${LEDGER_COLUMNS}
      `,
      [input.refType, input.refId],
    );

    if (!claimed) {
      const current = await getLedgerByRef(input.refType, input.refId);
      const wallet = await ensureWallet(customerId);
      if (current) {
        return { wallet, ledger: current, alreadyApplied: true };
      }
    }
  }

  const updated = await queryOne<WalletRow>(
    `
      UPDATE ${WALLETS_TABLE}
      SET balance_cents = balance_cents + $2,
          updated_at = NOW()
      WHERE customer_id = $1
      RETURNING ${WALLET_COLUMNS}
    `,
    [customerId, amountCents],
  );

  if (!updated) {
    throw new DatabaseError({
      code: 'WALLET_CREDIT_FAILED',
      message: 'Failed to credit wallet',
    });
  }

  if (input.refType && input.refId) {
    const ledger = await queryOne<WalletLedgerRow>(
      `
        UPDATE ${LEDGER_TABLE}
        SET status = 'completed',
            delta_cents = $3,
            balance_after_cents = $4,
            description = $5,
            metadata = $6::jsonb
        WHERE ref_type = $1 AND ref_id = $2
        RETURNING ${LEDGER_COLUMNS}
      `,
      [
        input.refType,
        input.refId,
        amountCents,
        updated.balanceCents,
        input.description,
        JSON.stringify(input.metadata || {}),
      ],
    );
    if (ledger) {
      return { wallet: updated, ledger, alreadyApplied: false };
    }
  }

  const ledger = await insertLedgerAndReturn({
    customerId,
    deltaCents: amountCents,
    balanceAfterCents: updated.balanceCents,
    kind: input.kind,
    description: input.description,
    refType: input.refType,
    refId: input.refId,
    metadata: input.metadata,
  });
  return { wallet: updated, ledger, alreadyApplied: false };
}

export async function debitWallet(input: {
  customerId: string;
  amountCents: number;
  kind: WalletLedgerKind;
  description: string;
  refType?: string | null;
  refId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ wallet: WalletRow; ledger: WalletLedgerRow }> {
  const customerId = String(input.customerId || '').trim();
  const amountCents = Math.trunc(input.amountCents);

  if (!customerId) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_CUSTOMER',
      message: 'customerId is required',
    });
  }

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_AMOUNT',
      message: 'Charge amount must be greater than 0',
    });
  }

  await ensureWalletTables();
  const wallet = await ensureWallet(customerId);

  if (wallet.balanceCents < amountCents) {
    throw new DatabaseError({
      code: 'WALLET_INSUFFICIENT',
      message: 'Insufficient wallet balance',
    });
  }

  const updated = await queryOne<WalletRow>(
    `
      UPDATE ${WALLETS_TABLE}
      SET balance_cents = balance_cents - $2,
          updated_at = NOW()
      WHERE customer_id = $1
        AND balance_cents >= $2
      RETURNING ${WALLET_COLUMNS}
    `,
    [customerId, amountCents],
  );

  if (!updated) {
    throw new DatabaseError({
      code: 'WALLET_INSUFFICIENT',
      message: 'Insufficient wallet balance',
    });
  }

  const ledger = await insertLedgerAndReturn({
    customerId,
    deltaCents: -amountCents,
    balanceAfterCents: updated.balanceCents,
    kind: input.kind,
    description: input.description,
    refType: input.refType,
    refId: input.refId,
    metadata: input.metadata,
  });

  return { wallet: updated, ledger };
}

export function quoteCinemaWatchCharge(
  price: string | number | null | undefined,
  plan: UserPlanType | string | null | undefined,
): { baseFeeCents: number; chargeCents: number; discounted: boolean } {
  const baseFeeCents = screeningPriceToCents(price);
  const normalizedPlan = String(plan || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
  const discounted = normalizedPlan === 'PAID' || normalizedPlan === 'EXTRA-PAID';
  const chargeCents = discounted ? Math.floor(baseFeeCents / 2) : baseFeeCents;
  return { baseFeeCents, chargeCents, discounted };
}

export async function getCinemaWatchQuote(
  screeningId: number,
  plan: UserPlanType | string | null | undefined,
): Promise<CinemaWatchQuote> {
  const screening = await getCinemaFilmScreeningById(screeningId);
  if (!screening) {
    throw new DatabaseError({
      code: 'WALLET_SCREENING_NOT_FOUND',
      message: 'Screening not found',
    });
  }

  const film = await getCinemaFilmById(screening.filmId);
  const { baseFeeCents, chargeCents, discounted } = quoteCinemaWatchCharge(
    screening.price,
    plan,
  );

  if (chargeCents > MAX_SERVICE_CHARGE_CENTS) {
    throw new DatabaseError({
      code: 'WALLET_CHARGE_TOO_LARGE',
      message: 'Screening fee is too large to charge from the wallet',
    });
  }

  return {
    screeningId: screening.id,
    filmId: screening.filmId,
    filmTitle: film?.title || 'Screening',
    pricingType: screening.pricingType === 'paid' ? 'paid' : 'free',
    baseFeeCents,
    chargeCents,
    discounted,
  };
}

export async function chargeCinemaWatch(input: {
  customerId: string;
  screeningId: number;
}): Promise<{
  wallet: WalletRow;
  ledger: WalletLedgerRow | null;
  quote: CinemaWatchQuote;
}> {
  const user = await getUserById(input.customerId);
  if (!user) {
    throw new DatabaseError({
      code: 'WALLET_INVALID_CUSTOMER',
      message: 'User not found',
    });
  }

  const quote = await getCinemaWatchQuote(input.screeningId, user.plan);
  if (quote.chargeCents <= 0) {
    const wallet = await ensureWallet(input.customerId);
    return { wallet, ledger: null, quote };
  }

  const result = await debitWallet({
    customerId: input.customerId,
    amountCents: quote.chargeCents,
    kind: 'cinema_watch',
    description: `Cinema: ${quote.filmTitle}`,
    refType: 'cinema_screening',
    refId: `${quote.screeningId}:${crypto.randomUUID()}`,
    metadata: {
      screeningId: quote.screeningId,
      filmId: quote.filmId,
      filmTitle: quote.filmTitle,
      baseFeeCents: quote.baseFeeCents,
      discounted: quote.discounted,
    },
  });

  return { wallet: result.wallet, ledger: result.ledger, quote };
}
