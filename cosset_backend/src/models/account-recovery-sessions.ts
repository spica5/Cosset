import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseError } from '@/db/errors';
import { queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'account_recovery_sessions';
const SESSION_EXPIRY_MINUTES = 30;

let ensureTablePromise: Promise<void> | null = null;

const ensureRecoverySessionsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            pending_email VARCHAR(255) NULL,
            email_code_hash VARCHAR(255) NULL,
            email_code_expires_at TIMESTAMP NULL,
            consumed_at TIMESTAMP NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_account_recovery_sessions_user_id ON ${TABLE_NAME} (user_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export type RecoverySessionRow = {
  id: number;
  userId: string;
  tokenHash: string;
  pendingEmail: string | null;
  emailCodeHash: string | null;
  emailCodeExpiresAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export function generateRecoveryToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createRecoverySession(userId: string): Promise<string> {
  await ensureRecoverySessionsTable();

  const token = generateRecoveryToken();
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000);

  try {
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE user_id = $1 AND consumed_at IS NULL`, [
      userId,
    ]);

    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [userId, tokenHash, expiresAt],
    );

    return token;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_RECOVERY_SESSION_ERROR',
        message: `Failed to create recovery session: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

async function findActiveSessionByToken(token: string): Promise<RecoverySessionRow | null> {
  await ensureRecoverySessionsTable();

  const rows = await queryMany<RecoverySessionRow>(
    `
      SELECT
        id,
        user_id as "userId",
        token_hash as "tokenHash",
        pending_email as "pendingEmail",
        email_code_hash as "emailCodeHash",
        email_code_expires_at as "emailCodeExpiresAt",
        consumed_at as "consumedAt",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM ${TABLE_NAME}
      WHERE consumed_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 50
    `,
  );

  const comparisons = await Promise.all(
    rows.map(async (row) => ({
      row,
      match: await bcrypt.compare(token, row.tokenHash),
    })),
  );

  const matched = comparisons.find((item) => item.match);
  return matched?.row ?? null;
}

export async function getRecoverySessionByToken(token: string): Promise<RecoverySessionRow | null> {
  try {
    return await findActiveSessionByToken(token);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_RECOVERY_SESSION_ERROR',
        message: `Failed to get recovery session: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function setRecoveryPendingEmail(
  sessionId: number,
  email: string,
  code: string,
): Promise<void> {
  await ensureRecoverySessionsTable();

  const emailCodeHash = await bcrypt.hash(code, 10);
  const emailCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const normalizedEmail = email.trim().toLowerCase();

  await executeQuery(
    `
      UPDATE ${TABLE_NAME}
      SET
        pending_email = $2,
        email_code_hash = $3,
        email_code_expires_at = $4
      WHERE id = $1
    `,
    [sessionId, normalizedEmail, emailCodeHash, emailCodeExpiresAt],
  );
}

export async function verifyRecoveryPendingEmailCode(
  session: RecoverySessionRow,
  email: string,
  code: string,
): Promise<boolean> {
  if (!session.pendingEmail || !session.emailCodeHash || !session.emailCodeExpiresAt) {
    return false;
  }

  if (session.pendingEmail !== email.trim().toLowerCase()) {
    return false;
  }

  if (new Date(session.emailCodeExpiresAt).getTime() < Date.now()) {
    return false;
  }

  return bcrypt.compare(code, session.emailCodeHash);
}

export async function consumeRecoverySession(sessionId: number): Promise<void> {
  await ensureRecoverySessionsTable();
  await executeQuery(`UPDATE ${TABLE_NAME} SET consumed_at = NOW() WHERE id = $1`, [sessionId]);
}
