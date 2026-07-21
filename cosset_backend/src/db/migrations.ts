/**
 * Database Migrations Module
 *
 * Provides utilities for managing database schema migrations and tracking
 * which migrations have been executed.
 *
 * @module db/migrations
 */

import { executeQuery } from './neon';

/**
 * Migration record metadata
 */
export interface Migration {
  /** UUID of the migration record */
  id: string;
  /** Name/identifier of the migration */
  name: string;
  /** Version number for ordering */
  version: number;
  /** Timestamp when migration was executed */
  executedAt: Date;
}

/**
 * Ensure migrations tracking table exists
 *
 * Creates the migrations table if it doesn't exist.
 * Safe to call multiple times (idempotent).
 *
 * @internal
 */
async function ensureMigrationsTable(): Promise<void> {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      version INTEGER NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of all executed migrations
 */
export async function getExecutedMigrations(): Promise<Migration[]> {
  await ensureMigrationsTable();
  const result = await executeQuery<Migration>(`
    SELECT id, name, version, executed_at as "executedAt"
    FROM migrations
    ORDER BY version ASC
  `);

  return result.rows;
}

/**
 * Record a migration execution
 */
export async function recordMigration(
  name: string,
  version: number,
): Promise<void> {
  await executeQuery(
    `
      INSERT INTO migrations (name, version)
      VALUES ($1, $2)
    `,
    [name, version],
  );
}

/**
 * Check if a migration has been executed
 */
export async function isMigrationExecuted(name: string): Promise<boolean> {
  const result = await executeQuery<{ id: string }>(
    `
      SELECT id
      FROM migrations
      WHERE name = $1
      LIMIT 1
    `,
    [name],
  );

  return result.rows.length > 0;
}
