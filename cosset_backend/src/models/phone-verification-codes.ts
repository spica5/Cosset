import bcrypt from 'bcryptjs';
import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

const TABLE_NAME = 'phone_verification_codes';
const CODE_EXPIRY_MINUTES = 15;

let ensureTablePromise: Promise<void> | null = null;

const ensurePhoneVerificationCodesTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            phone VARCHAR(64) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            user_id UUID NULL,
            purpose VARCHAR(32) NOT NULL DEFAULT 'verify',
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_phone ON ${TABLE_NAME} (phone)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

function normalizePhoneKey(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export async function createPhoneVerificationCode(
  phone: string,
  code: string,
  options?: { userId?: string | null; purpose?: string },
): Promise<void> {
  await ensurePhoneVerificationCodesTable();

  const phoneKey = normalizePhoneKey(phone);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  const purpose = options?.purpose || 'verify';

  try {
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE phone = $1 AND purpose = $2`, [
      phoneKey,
      purpose,
    ]);

    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (phone, code_hash, user_id, purpose, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [phoneKey, codeHash, options?.userId || null, purpose, expiresAt],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_PHONE_VERIFICATION_CODE_ERROR',
        message: `Failed to create phone verification code: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function verifyPhoneVerificationCode(
  phone: string,
  code: string,
  purpose = 'verify',
): Promise<boolean> {
  await ensurePhoneVerificationCodesTable();

  const phoneKey = normalizePhoneKey(phone);

  try {
    const row = await queryOne<{
      id: number;
      codeHash: string;
      expiresAt: Date;
    }>(
      `
        SELECT
          id,
          code_hash as "codeHash",
          expires_at as "expiresAt"
        FROM ${TABLE_NAME}
        WHERE phone = $1 AND purpose = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [phoneKey, purpose],
    );

    if (!row) {
      return false;
    }

    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE phone = $1 AND purpose = $2`, [
        phoneKey,
        purpose,
      ]);
      return false;
    }

    const isValid = await bcrypt.compare(code, row.codeHash);

    if (!isValid) {
      return false;
    }

    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE phone = $1 AND purpose = $2`, [
      phoneKey,
      purpose,
    ]);
    return true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'VERIFY_PHONE_VERIFICATION_CODE_ERROR',
        message: `Failed to verify phone verification code: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
