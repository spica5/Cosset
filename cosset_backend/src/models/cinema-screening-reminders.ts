import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'cinema_screening_reminders_sent';

let ensureTablePromise: Promise<void> | null = null;

const ensureCinemaScreeningRemindersTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            customer_id UUID NOT NULL,
            screening_id BIGINT NOT NULL,
            show_instant TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_cinema_screening_reminder UNIQUE (customer_id, screening_id, show_instant),
            CONSTRAINT fk_cinema_screening_reminder_customer
              FOREIGN KEY (customer_id) REFERENCES cosset_users(id) ON DELETE CASCADE
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_cinema_screening_reminders_show
          ON ${TABLE_NAME} (show_instant)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

/** Returns true when this reminder was newly recorded (not previously sent). */
export async function claimCinemaScreeningReminder(input: {
  customerId: string;
  screeningId: number;
  showInstant: Date;
}): Promise<boolean> {
  try {
    await ensureCinemaScreeningRemindersTable();

    const row = await queryOne<{ id: number }>(
      `
        INSERT INTO ${TABLE_NAME} (customer_id, screening_id, show_instant)
        VALUES ($1, $2, $3)
        ON CONFLICT (customer_id, screening_id, show_instant) DO NOTHING
        RETURNING id
      `,
      [input.customerId, input.screeningId, input.showInstant.toISOString()],
    );

    return Boolean(row?.id);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'CLAIM_CINEMA_SCREENING_REMINDER_ERROR',
      message: `Failed to claim cinema screening reminder: ${message}`,
    });
  }
}
