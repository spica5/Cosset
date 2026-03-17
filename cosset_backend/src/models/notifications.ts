import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'notification';

export interface Notification {
  id: number;
  customerId: string;
  avatarUrl?: string | null;
  type: number;
  category: number;
  isUnRead: boolean;
  isArchived: boolean;
  title?: string | null;
  content?: string | null;
  createdAt?: Date | null;
}

let ensureNotificationsTablePromise: Promise<void> | null = null;

const ensureNotificationsTable = async (): Promise<void> => {
  if (!ensureNotificationsTablePromise) {
    ensureNotificationsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            avatar_url TEXT NULL,
            type INTEGER NOT NULL,
            category INTEGER NOT NULL,
            is_unread BOOLEAN NOT NULL DEFAULT TRUE,
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            title TEXT NULL,
            content TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`,
      );

      await executeQuery(
        `UPDATE ${TABLE_NAME} SET is_archived = FALSE WHERE is_archived IS NULL`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_notification_customer ON ${TABLE_NAME} (customer_id)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_notification_customer_state ON ${TABLE_NAME} (customer_id, is_unread, is_archived)`,
      );
    })().catch((error) => {
      ensureNotificationsTablePromise = null;
      throw error;
    });
  }

  await ensureNotificationsTablePromise;
};

export async function getNotificationById(id: number): Promise<Notification | null> {
  try {
    await ensureNotificationsTable();

    const notification = await queryOne<Notification>(
      `
        SELECT
          id,
          customer_id as "customerId",
          avatar_url as "avatarUrl",
          type,
          category,
          is_unread as "isUnRead",
          is_archived as "isArchived",
          title,
          content,
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id]
    );

    return notification;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_NOTIFICATION_ERROR',
        message: `Failed to fetch notification: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getAllNotifications(
  customerId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<Notification[]> {
  try {
    await ensureNotificationsTable();

    let query = `
      SELECT
        id,
        customer_id as "customerId",
        avatar_url as "avatarUrl",
        type,
        category,
        is_unread as "isUnRead",
        is_archived as "isArchived",
        title,
        content,
        created_at as "createdAt"
      FROM ${TABLE_NAME}
    `;
    const params: unknown[] = [];

    if (customerId) {
      query += ` WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<Notification>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_NOTIFICATIONS_ERROR',
        message: `Failed to fetch notifications: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification> {
  try {
    await ensureNotificationsTable();

    const created = await queryOne<Notification>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          avatar_url,
          type,
          category,
          is_unread,
          is_archived,
          title,
          content,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING
          id,
          customer_id as "customerId",
          avatar_url as "avatarUrl",
          type,
          category,
          is_unread as "isUnRead",
          is_archived as "isArchived",
          title,
          content,
          created_at as "createdAt"
      `,
      [
        notification.customerId,
        notification.avatarUrl ?? null,
        notification.type,
        notification.category,
        notification.isUnRead,
        notification.isArchived,
        notification.title ?? null,
        notification.content ?? null,
      ]
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_NOTIFICATION_FAILED',
        message: 'Failed to create notification: No data returned',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_NOTIFICATION_ERROR',
        message: `Failed to create notification: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function updateNotification(
  id: number,
  notification: Partial<Omit<Notification, 'id' | 'createdAt'>>
): Promise<Notification> {
  try {
    await ensureNotificationsTable();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (notification.customerId !== undefined) {
      fields.push(`customer_id = $${paramIndex}`);
      values.push(notification.customerId);
      paramIndex += 1;
    }
    if (notification.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex}`);
      values.push(notification.avatarUrl);
      paramIndex += 1;
    }
    if (notification.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(notification.type);
      paramIndex += 1;
    }
    if (notification.category !== undefined) {
      fields.push(`category = $${paramIndex}`);
      values.push(notification.category);
      paramIndex += 1;
    }
    if (notification.isUnRead !== undefined) {
      fields.push(`is_unread = $${paramIndex}`);
      values.push(notification.isUnRead);
      paramIndex += 1;
    }
    if (notification.isArchived !== undefined) {
      fields.push(`is_archived = $${paramIndex}`);
      values.push(notification.isArchived);
      paramIndex += 1;
    }
    if (notification.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(notification.title);
      paramIndex += 1;
    }
    if (notification.content !== undefined) {
      fields.push(`content = $${paramIndex}`);
      values.push(notification.content);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      const existing = await getNotificationById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'NOTIFICATION_NOT_FOUND',
          message: `Notification with id ${id} not found`,
        });
      }

      return existing;
    }

    values.push(id);

    const updated = await queryOne<Notification>(
      `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          customer_id as "customerId",
          avatar_url as "avatarUrl",
          type,
          category,
          is_unread as "isUnRead",
          is_archived as "isArchived",
          title,
          content,
          created_at as "createdAt"
      `,
      values
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_NOTIFICATION_FAILED',
        message: 'Failed to update notification: No data returned',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_NOTIFICATION_ERROR',
        message: `Failed to update notification: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteNotification(id: number): Promise<boolean> {
  try {
    await ensureNotificationsTable();

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    return !!deleted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_NOTIFICATION_ERROR',
        message: `Failed to delete notification: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
