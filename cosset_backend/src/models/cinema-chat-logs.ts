import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'cinema_chat_logs';

let ensureTablePromise: Promise<void> | null = null;

export type CinemaRoomKey = {
  ownerCustomerId: string;
  category: string;
};

const normalizeRoom = (room: CinemaRoomKey) => ({
  ownerCustomerId: String(room.ownerCustomerId || '').trim(),
  category: String(room.category || '').trim().toLowerCase(),
});

const ensureCinemaChatLogsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            owner_customer_id VARCHAR(255) NOT NULL,
            category VARCHAR(24) NOT NULL,
            sender_id UUID NULL,
            sender_name VARCHAR(100) NULL,
            receiver_id UUID NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            message TEXT NULL,
            file_url VARCHAR(1000) NULL,
            file_name VARCHAR(255) NULL,
            mime_type VARCHAR(100) NULL,
            chat_mode VARCHAR(20) DEFAULT 'public',
            is_read BOOLEAN DEFAULT FALSE,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_cinema_chat_logs_room ON ${TABLE_NAME} (owner_customer_id, category, created_at)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export type CinemaChatLogInsert = {
  room: CinemaRoomKey;
  senderId: string | null;
  senderName: string;
  receiverId?: string | null;
  messageType: string;
  message: string;
  chatMode?: 'public' | 'friend' | 'private';
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

export type CinemaChatLogRow = {
  id: string;
  ownerCustomerId: string;
  category: string;
  createdAt: Date;
};

export type CinemaChatLogQueryRow = {
  id: string;
  ownerCustomerId: string;
  category: string;
  senderId: string | null;
  receiverId: string | null;
  senderName: string | null;
  message: string | null;
  messageType: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  chatMode: string;
  createdAt: Date | string;
};

const isLikelyUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export async function listCinemaChatLogs(room: CinemaRoomKey): Promise<CinemaChatLogQueryRow[]> {
  const { ownerCustomerId, category } = normalizeRoom(room);

  try {
    await ensureCinemaChatLogsTable();

    return await queryMany<CinemaChatLogQueryRow>(
      `
        SELECT
          id::text AS id,
          owner_customer_id AS "ownerCustomerId",
          category,
          sender_id::text AS "senderId",
          receiver_id::text AS "receiverId",
          sender_name AS "senderName",
          message,
          COALESCE(message_type, 'text') AS "messageType",
          file_url AS "fileUrl",
          file_name AS "fileName",
          mime_type AS "mimeType",
          COALESCE(chat_mode, 'public') AS "chatMode",
          created_at AS "createdAt"
        FROM ${TABLE_NAME}
        WHERE owner_customer_id = $1
          AND category = $2
          AND (is_deleted IS NOT TRUE)
          AND COALESCE(message_type, 'text') IN ('text', 'file')
        ORDER BY created_at ASC, id ASC
      `,
      [ownerCustomerId, category],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_CHAT_LOG_LIST_ERROR',
      message: `Failed to list chat logs: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function createCinemaChatLog(row: CinemaChatLogInsert): Promise<CinemaChatLogRow> {
  const { ownerCustomerId, category } = normalizeRoom(row.room);

  try {
    await ensureCinemaChatLogsTable();

    const senderId =
      row.senderId && isLikelyUuid(row.senderId) ? row.senderId.trim().toLowerCase() : null;
    const receiverId =
      row.receiverId && isLikelyUuid(row.receiverId) ? row.receiverId.trim().toLowerCase() : null;
    const senderName = row.senderName.slice(0, 100);
    const messageType = (row.messageType || 'text').slice(0, 20);
    const message = row.message.slice(0, 2000);
    const chatMode =
      row.chatMode && ['public', 'friend', 'private'].includes(row.chatMode)
        ? row.chatMode
        : 'public';

    const inserted = await queryOne<CinemaChatLogRow>(
      `
        INSERT INTO ${TABLE_NAME} (
          owner_customer_id,
          category,
          sender_id,
          sender_name,
          receiver_id,
          message_type,
          message,
          chat_mode,
          file_url,
          file_name,
          mime_type,
          is_read,
          is_deleted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE, FALSE)
        RETURNING
          id::text,
          owner_customer_id as "ownerCustomerId",
          category,
          created_at as "createdAt"
      `,
      [
        ownerCustomerId,
        category,
        senderId,
        senderName,
        receiverId,
        messageType,
        message,
        chatMode,
        row.fileUrl?.slice(0, 1000) ?? null,
        row.fileName?.slice(0, 255) ?? null,
        row.mimeType?.slice(0, 100) ?? null,
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'CINEMA_CHAT_LOG_INSERT_FAILED',
        message: 'Failed to insert cinema chat log',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CINEMA_CHAT_LOG_ERROR',
      message: `Failed to save chat log: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
