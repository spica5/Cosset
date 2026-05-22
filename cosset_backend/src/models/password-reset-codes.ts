import bcrypt from 'bcryptjs';

import { DatabaseError } from '@/db/errors';
import { executeQuery, queryOne } from '@/db/neon';

const TABLE_NAME = 'password_reset_codes';
const CODE_EXPIRY_MINUTES = 15;

let ensureTablePromise: Promise<void> | null = null;

const ensurePasswordResetCodesTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON ${TABLE_NAME} (email)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export type PasswordResetCodeRow = {
  id: number;
  email: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export async function createPasswordResetCode(email: string, code: string): Promise<void> {
  await ensurePasswordResetCodesTable();

  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  try {
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE email = $1`, [normalizedEmail]);

    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (email, code_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [normalizedEmail, codeHash, expiresAt],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_PASSWORD_RESET_CODE_ERROR',
        message: `Failed to create password reset code: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<boolean> {
  await ensurePasswordResetCodesTable();

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const row = await queryOne<PasswordResetCodeRow>(
      `
        SELECT
          id,
          email,
          code_hash as "codeHash",
          expires_at as "expiresAt",
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE email = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [normalizedEmail],
    );

    if (!row) {
      return false;
    }

    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE email = $1`, [normalizedEmail]);
      return false;
    }

    const isValid = await bcrypt.compare(code, row.codeHash);

    if (!isValid) {
      return false;
    }

    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE email = $1`, [normalizedEmail]);
    return true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'VERIFY_PASSWORD_RESET_CODE_ERROR',
        message: `Failed to verify password reset code: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
