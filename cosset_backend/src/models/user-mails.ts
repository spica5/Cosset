import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'user_mails';

let ensureTablePromise: Promise<void> | null = null;

export type MailRecipient = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type UserMailRow = {
  id: string;
  ownerUserId: string;
  folder: string;
  fromUserId: string | null;
  fromName: string;
  fromEmail: string;
  toRecipients: MailRecipient[];
  ccRecipients: MailRecipient[];
  bccRecipients: MailRecipient[];
  subject: string;
  message: string;
  labelIds: string[];
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  attachments: unknown[];
  createdAt: Date | string;
};

export type UserMailInsert = {
  ownerUserId: string;
  folder: string;
  fromUserId?: string | null;
  fromName: string;
  fromEmail: string;
  toRecipients: MailRecipient[];
  ccRecipients?: MailRecipient[];
  bccRecipients?: MailRecipient[];
  subject: string;
  message: string;
  labelIds?: string[];
  isUnread?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  attachments?: unknown[];
};

const ensureUserMailsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            owner_user_id UUID NOT NULL,
            folder VARCHAR(20) NOT NULL DEFAULT 'inbox',
            from_user_id UUID NULL,
            from_name VARCHAR(255) NOT NULL DEFAULT '',
            from_email VARCHAR(255) NOT NULL DEFAULT '',
            to_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
            cc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
            bcc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
            subject VARCHAR(500) NOT NULL DEFAULT '',
            message TEXT NOT NULL DEFAULT '',
            label_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_unread BOOLEAN NOT NULL DEFAULT TRUE,
            is_starred BOOLEAN NOT NULL DEFAULT FALSE,
            is_important BOOLEAN NOT NULL DEFAULT FALSE,
            attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_mails_owner_folder ON ${TABLE_NAME} (owner_user_id, folder)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_mails_owner_created ON ${TABLE_NAME} (owner_user_id, created_at DESC)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const parseRecipients = (value: unknown): MailRecipient[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const recipients: MailRecipient[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const record = item as Record<string, unknown>;
    const email = typeof record.email === 'string' ? record.email.trim() : '';
    const name = typeof record.name === 'string' ? record.name.trim() : email;
    if (!email) {
      return;
    }
    recipients.push({
      name: name || email,
      email,
      avatarUrl:
        typeof record.avatarUrl === 'string' && record.avatarUrl.trim()
          ? record.avatarUrl.trim()
          : null,
    });
  });

  return recipients;
};

const mapRow = (row: Record<string, unknown>): UserMailRow => ({
  id: String(row.id ?? ''),
  ownerUserId: String(row.ownerUserId ?? ''),
  folder: String(row.folder ?? 'inbox'),
  fromUserId: row.fromUserId ? String(row.fromUserId) : null,
  fromName: String(row.fromName ?? ''),
  fromEmail: String(row.fromEmail ?? ''),
  toRecipients: parseRecipients(row.toRecipients),
  ccRecipients: parseRecipients(row.ccRecipients),
  bccRecipients: parseRecipients(row.bccRecipients),
  subject: String(row.subject ?? ''),
  message: String(row.message ?? ''),
  labelIds: Array.isArray(row.labelIds)
    ? row.labelIds.map((label) => String(label)).filter(Boolean)
    : [],
  isUnread: Boolean(row.isUnread),
  isStarred: Boolean(row.isStarred),
  isImportant: Boolean(row.isImportant),
  attachments: Array.isArray(row.attachments) ? row.attachments : [],
  createdAt: (row.createdAt as Date | string) ?? new Date().toISOString(),
});

export async function createUserMail(row: UserMailInsert): Promise<UserMailRow> {
  try {
    await ensureUserMailsTable();

    const inserted = await queryOne<Record<string, unknown>>(
      `
        INSERT INTO ${TABLE_NAME} (
          owner_user_id,
          folder,
          from_user_id,
          from_name,
          from_email,
          to_recipients,
          cc_recipients,
          bcc_recipients,
          subject,
          message,
          label_ids,
          is_unread,
          is_starred,
          is_important,
          attachments,
          is_deleted
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11::jsonb, $12, $13, $14, $15::jsonb, FALSE)
        RETURNING
          id::text AS id,
          owner_user_id::text AS "ownerUserId",
          folder,
          from_user_id::text AS "fromUserId",
          from_name AS "fromName",
          from_email AS "fromEmail",
          to_recipients AS "toRecipients",
          cc_recipients AS "ccRecipients",
          bcc_recipients AS "bccRecipients",
          subject,
          message,
          label_ids AS "labelIds",
          is_unread AS "isUnread",
          is_starred AS "isStarred",
          is_important AS "isImportant",
          attachments,
          created_at AS "createdAt"
      `,
      [
        row.ownerUserId.trim().toLowerCase(),
        row.folder,
        row.fromUserId?.trim().toLowerCase() || null,
        row.fromName.slice(0, 255),
        row.fromEmail.slice(0, 255),
        JSON.stringify(row.toRecipients),
        JSON.stringify(row.ccRecipients ?? []),
        JSON.stringify(row.bccRecipients ?? []),
        row.subject.slice(0, 500),
        row.message,
        JSON.stringify(row.labelIds ?? []),
        row.isUnread ?? true,
        row.isStarred ?? false,
        row.isImportant ?? false,
        JSON.stringify(row.attachments ?? []),
      ],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'USER_MAIL_INSERT_FAILED',
        message: 'Failed to insert mail',
      });
    }

    return mapRow(inserted);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'USER_MAIL_INSERT_ERROR',
      message: `Failed to save mail: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function listUserMails(ownerUserId: string): Promise<UserMailRow[]> {
  try {
    await ensureUserMailsTable();

    const rows = await queryMany<Record<string, unknown>>(
      `
        SELECT
          id::text AS id,
          owner_user_id::text AS "ownerUserId",
          folder,
          from_user_id::text AS "fromUserId",
          from_name AS "fromName",
          from_email AS "fromEmail",
          to_recipients AS "toRecipients",
          cc_recipients AS "ccRecipients",
          bcc_recipients AS "bccRecipients",
          subject,
          message,
          label_ids AS "labelIds",
          is_unread AS "isUnread",
          is_starred AS "isStarred",
          is_important AS "isImportant",
          attachments,
          created_at AS "createdAt"
        FROM ${TABLE_NAME}
        WHERE owner_user_id = $1
          AND is_deleted = FALSE
        ORDER BY created_at DESC, id DESC
      `,
      [ownerUserId.trim().toLowerCase()],
    );

    return rows.map(mapRow);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'USER_MAIL_LIST_ERROR',
      message: `Failed to list mails: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function markUserMailAsRead(
  ownerUserId: string,
  mailId: string | number,
): Promise<UserMailRow | null> {
  try {
    await ensureUserMailsTable();

    const updated = await queryOne<Record<string, unknown>>(
      `
        UPDATE ${TABLE_NAME}
        SET is_unread = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE owner_user_id = $1
          AND id = $2
          AND is_deleted = FALSE
          AND is_unread = TRUE
        RETURNING
          id::text AS id,
          owner_user_id::text AS "ownerUserId",
          folder,
          from_user_id::text AS "fromUserId",
          from_name AS "fromName",
          from_email AS "fromEmail",
          to_recipients AS "toRecipients",
          cc_recipients AS "ccRecipients",
          bcc_recipients AS "bccRecipients",
          subject,
          message,
          label_ids AS "labelIds",
          is_unread AS "isUnread",
          is_starred AS "isStarred",
          is_important AS "isImportant",
          attachments,
          created_at AS "createdAt"
      `,
      [ownerUserId.trim().toLowerCase(), mailId],
    );

    if (updated) {
      return mapRow(updated);
    }

    return await getUserMailById(ownerUserId, mailId);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'USER_MAIL_MARK_READ_ERROR',
      message: `Failed to mark mail as read: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteUserMail(
  ownerUserId: string,
  mailId: string | number,
): Promise<{ permanent: boolean } | null> {
  try {
    await ensureUserMailsTable();

    const existing = await getUserMailById(ownerUserId, mailId);
    if (!existing) {
      return null;
    }

    if (existing.folder === 'trash') {
      await executeQuery(
        `
          UPDATE ${TABLE_NAME}
          SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
          WHERE owner_user_id = $1
            AND id = $2
            AND is_deleted = FALSE
        `,
        [ownerUserId.trim().toLowerCase(), mailId],
      );

      return { permanent: true };
    }

    await executeQuery(
      `
        UPDATE ${TABLE_NAME}
        SET folder = 'trash', updated_at = CURRENT_TIMESTAMP
        WHERE owner_user_id = $1
          AND id = $2
          AND is_deleted = FALSE
      `,
      [ownerUserId.trim().toLowerCase(), mailId],
    );

    return { permanent: false };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'USER_MAIL_DELETE_ERROR',
      message: `Failed to delete mail: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getUserMailById(
  ownerUserId: string,
  mailId: string | number,
): Promise<UserMailRow | null> {
  try {
    await ensureUserMailsTable();

    const row = await queryOne<Record<string, unknown>>(
      `
        SELECT
          id::text AS id,
          owner_user_id::text AS "ownerUserId",
          folder,
          from_user_id::text AS "fromUserId",
          from_name AS "fromName",
          from_email AS "fromEmail",
          to_recipients AS "toRecipients",
          cc_recipients AS "ccRecipients",
          bcc_recipients AS "bccRecipients",
          subject,
          message,
          label_ids AS "labelIds",
          is_unread AS "isUnread",
          is_starred AS "isStarred",
          is_important AS "isImportant",
          attachments,
          created_at AS "createdAt"
        FROM ${TABLE_NAME}
        WHERE owner_user_id = $1
          AND id = $2
          AND is_deleted = FALSE
        LIMIT 1
      `,
      [ownerUserId.trim().toLowerCase(), mailId],
    );

    return row ? mapRow(row) : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'USER_MAIL_GET_ERROR',
      message: `Failed to fetch mail: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
