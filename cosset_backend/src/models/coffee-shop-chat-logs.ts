import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany, queryOne } from '@/db/neon';

const TABLE_NAME = 'coffee_shop_chat_logs';

let ensureTablePromise: Promise<void> | null = null;

const ensureCoffeeShopChatLogsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            coffee_shop_id INT NOT NULL,
            sender_id UUID NULL,
            sender_name VARCHAR(100) NULL,
            sender_type VARCHAR(20) DEFAULT 'guest',
            message_type VARCHAR(20) DEFAULT 'text',
            message TEXT NULL,
            file_url VARCHAR(1000) NULL,
            file_name VARCHAR(255) NULL,
            mime_type VARCHAR(100) NULL,
            is_read BOOLEAN DEFAULT FALSE,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

export type CoffeeShopChatLogInsert = {
  coffeeShopId: number;
  senderId: string | null;
  senderName: string;
  senderType: 'guest' | 'member';
  messageType: string;
  message: string;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

export type CoffeeShopChatLogRow = {
  id: string;
  coffeeShopId: number;
  createdAt: Date;
};

const isLikelyUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export type CoffeeShopChatLogQueryRow = {
  id: string;
  coffeeShopId: number;
  senderId: string | null;
  senderName: string | null;
  message: string | null;
  createdAt: Date | string;
};

/**
 * Text messages for this shop created on the current UTC calendar day.
 */
export async function listCoffeeShopChatLogsToday(coffeeShopId: number): Promise<CoffeeShopChatLogQueryRow[]> {
  try {
    await ensureCoffeeShopChatLogsTable();

    return await queryMany<CoffeeShopChatLogQueryRow>(
      `
        SELECT
          id::text AS id,
          coffee_shop_id AS "coffeeShopId",
          sender_id::text AS "senderId",
          sender_name AS "senderName",
          message,
          created_at AS "createdAt"
        FROM ${TABLE_NAME}
        WHERE coffee_shop_id = $1
          AND (is_deleted IS NOT TRUE)
          AND COALESCE(message_type, 'text') = 'text'
          AND (created_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date
        ORDER BY created_at ASC, id ASC
      `,
      [coffeeShopId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_CHAT_LOG_LIST_ERROR',
      message: `Failed to list chat logs: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Persist a coffee shop chat message.
 */
export async function createCoffeeShopChatLog(row: CoffeeShopChatLogInsert): Promise<CoffeeShopChatLogRow> {
  try {
    await ensureCoffeeShopChatLogsTable();

    const senderId =
      row.senderId && isLikelyUuid(row.senderId) ? row.senderId.trim().toLowerCase() : null;
    const senderName = row.senderName.slice(0, 100);
    const senderType = row.senderType === 'member' ? 'member' : 'guest';
    const messageType = (row.messageType || 'text').slice(0, 20);
    const message = row.message.slice(0, 2000);
    const fileUrl = row.fileUrl?.slice(0, 1000) ?? null;
    const fileName = row.fileName?.slice(0, 255) ?? null;
    const mimeType = row.mimeType?.slice(0, 100) ?? null;

    const inserted = await queryOne<CoffeeShopChatLogRow>(
      `
        INSERT INTO ${TABLE_NAME} (
          coffee_shop_id,
          sender_id,
          sender_name,
          sender_type,
          message_type,
          message,
          file_url,
          file_name,
          mime_type,
          is_read,
          is_deleted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, FALSE)
        RETURNING
          id::text,
          coffee_shop_id as "coffeeShopId",
          created_at as "createdAt"
      `,
      [
        row.coffeeShopId,
        senderId,
        senderName,
        senderType,
        messageType,
        message,
        fileUrl,
        fileName,
        mimeType,
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'COFFEE_SHOP_CHAT_LOG_INSERT_FAILED',
        message: 'Failed to insert coffee shop chat log',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'COFFEE_SHOP_CHAT_LOG_ERROR',
      message: `Failed to save chat log: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
