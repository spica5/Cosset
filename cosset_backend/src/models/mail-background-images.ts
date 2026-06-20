import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'mail_background_images';

let ensureTablePromise: Promise<void> | null = null;

export type MailBackgroundImageRow = {
  id: string;
  imageKey: string;
  title: string | null;
  order: number | null;
  createdAt: Date | string;
};

export type MailBackgroundImageInsert = {
  imageKey: string;
  title?: string | null;
  order?: number | null;
};

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            image_key VARCHAR(500) NOT NULL,
            title VARCHAR(255),
            "order" INTEGER,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_background_images_key ON ${TABLE_NAME} (image_key)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const mapRow = (row: Record<string, unknown>): MailBackgroundImageRow => ({
  id: String(row.id ?? ''),
  imageKey: String(row.imageKey ?? ''),
  title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : null,
  order: typeof row.order === 'number' ? row.order : row.order != null ? Number(row.order) : null,
  createdAt: (row.createdAt as Date | string) ?? new Date().toISOString(),
});

export async function listMailBackgroundImages(): Promise<MailBackgroundImageRow[]> {
  try {
    await ensureTable();

    const rows = await queryMany<Record<string, unknown>>(
      `
        SELECT
          id::text AS id,
          image_key AS "imageKey",
          title,
          "order",
          created_at AS "createdAt"
        FROM ${TABLE_NAME}
        ORDER BY COALESCE("order", 2147483647) ASC, created_at ASC, id ASC
      `,
    );

    return rows.map(mapRow);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'MAIL_BACKGROUND_LIST_ERROR',
      message: `Failed to list mail backgrounds: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function createMailBackgroundImage(
  row: MailBackgroundImageInsert,
): Promise<MailBackgroundImageRow> {
  try {
    await ensureTable();

    const imageKey = row.imageKey.trim().slice(0, 500);
    if (!imageKey || imageKey.includes('..') || !imageKey.startsWith('mail/backgrounds/')) {
      throw new DatabaseError({
        code: 'MAIL_BACKGROUND_INVALID_KEY',
        message: 'Invalid background image key',
      });
    }

    const inserted = await queryOne<Record<string, unknown>>(
      `
        INSERT INTO ${TABLE_NAME} (image_key, title, "order")
        VALUES ($1, $2, $3)
        RETURNING
          id::text AS id,
          image_key AS "imageKey",
          title,
          "order",
          created_at AS "createdAt"
      `,
      [
        imageKey,
        row.title?.trim().slice(0, 255) || null,
        row.order ?? null,
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'MAIL_BACKGROUND_INSERT_FAILED',
        message: 'Failed to create mail background image',
      });
    }

    return mapRow(inserted);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'MAIL_BACKGROUND_INSERT_ERROR',
      message: `Failed to create mail background: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteMailBackgroundImage(id: string | number): Promise<boolean> {
  try {
    await ensureTable();

    const result = await executeQuery(
      `DELETE FROM ${TABLE_NAME} WHERE id = $1`,
      [id],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'MAIL_BACKGROUND_DELETE_ERROR',
      message: `Failed to delete mail background: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function isMailBackgroundImageKeyAllowed(imageKey: string): Promise<boolean> {
  try {
    await ensureTable();

    const row = await queryOne<{ id: string }>(
      `SELECT id::text AS id FROM ${TABLE_NAME} WHERE image_key = $1 LIMIT 1`,
      [imageKey.trim()],
    );

    return Boolean(row?.id);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'MAIL_BACKGROUND_LOOKUP_ERROR',
      message: `Failed to verify mail background: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
