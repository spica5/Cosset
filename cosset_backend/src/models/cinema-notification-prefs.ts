import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'cinema_notification_prefs';

export type CinemaNotificationPref = {
  id: number;
  customerId: string;
  /** New schedule posts + upcoming movies at Cosset Cinema */
  notifySchedule: boolean;
  createdAt: Date;
  updatedAt: Date;
};

let ensureTablePromise: Promise<void> | null = null;

const ensureCinemaNotificationPrefsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            customer_id UUID NOT NULL,
            notify_schedule BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_cinema_notification_prefs_customer UNIQUE (customer_id),
            CONSTRAINT fk_cinema_notification_prefs_customer
              FOREIGN KEY (customer_id) REFERENCES cosset_users(id) ON DELETE CASCADE
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_cinema_notification_prefs_schedule
          ON ${TABLE_NAME} (notify_schedule)
          WHERE notify_schedule = TRUE`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function getCinemaNotificationPref(
  customerId: string,
): Promise<CinemaNotificationPref | null> {
  try {
    await ensureCinemaNotificationPrefsTable();

    return await queryOne<CinemaNotificationPref>(
      `
        SELECT
          id,
          customer_id as "customerId",
          notify_schedule as "notifySchedule",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
      `,
      [customerId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'GET_CINEMA_NOTIFICATION_PREF_ERROR',
      message: `Failed to get cinema notification preference: ${message}`,
    });
  }
}

export async function setCinemaNotificationPref(
  customerId: string,
  notifySchedule: boolean,
): Promise<CinemaNotificationPref> {
  try {
    await ensureCinemaNotificationPrefsTable();

    const row = await queryOne<CinemaNotificationPref>(
      `
        INSERT INTO ${TABLE_NAME} (customer_id, notify_schedule, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (customer_id)
        DO UPDATE SET
          notify_schedule = EXCLUDED.notify_schedule,
          updated_at = NOW()
        RETURNING
          id,
          customer_id as "customerId",
          notify_schedule as "notifySchedule",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [customerId, notifySchedule],
    );

    if (!row) {
      throw new DatabaseError({
        code: 'SET_CINEMA_NOTIFICATION_PREF_FAILED',
        message: 'Failed to save cinema notification preference',
      });
    }

    return row;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'SET_CINEMA_NOTIFICATION_PREF_ERROR',
      message: `Failed to save cinema notification preference: ${message}`,
    });
  }
}

/** Users who opted in to Cosset Cinema schedule / upcoming-movie alerts. */
export async function listCinemaScheduleNotifyCustomerIds(): Promise<string[]> {
  try {
    await ensureCinemaNotificationPrefsTable();

    const rows = await queryMany<{ customerId: string }>(
      `
        SELECT customer_id as "customerId"
        FROM ${TABLE_NAME}
        WHERE notify_schedule = TRUE
      `,
    );

    return rows.map((row) => row.customerId).filter(Boolean);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'LIST_CINEMA_SCHEDULE_NOTIFY_ERROR',
      message: `Failed to list cinema notification subscribers: ${message}`,
    });
  }
}
