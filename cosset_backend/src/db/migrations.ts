/**
 * Database Migrations Module
 *
 * Provides utilities for managing database schema migrations and tracking
 * which migrations have been executed.
 *
 * This module maintains a migrations table that records all applied migrations.
 * Use these functions to track and manage your database schema changes.
 *
 * @module db/migrations
 *
 * @example
 * ```ts
 * import {
 *   getExecutedMigrations,
 *   recordMigration,
 *   isMigrationExecuted,
 * } from '@/db/migrations';
 *
 * // Check if migration was already applied
 * const executed = await isMigrationExecuted('001_create_users_table');
 *
 * // List all migrations
 * const migrations = await getExecutedMigrations();
 *
 * // Record new migration
 * await recordMigration('002_add_email_index', 2);
 * ```
 */

import { getDb } from './neon';

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
  executedAt?: Date;
}

/**
 * Get or create the migrations tracking table
 *
 * Creates the migrations table if it doesn't exist.
 * Safe to call multiple times (idempotent).
 *
 * @throws {DatabaseError} If table creation fails
 *
 * @internal
 */
async function ensureMigrationsTable(): Promise<void> {
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      version INTEGER NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

/**
 * Get list of all executed migrations
 *
 * Returns migrations ordered by version.
 * Ensures migrations table exists before querying.
 *
 * @returns Array of executed migrations in version order
 * @throws {DatabaseError} If query fails
 */
export async function getExecutedMigrations(): Promise<Migration[]> {
  await ensureMigrationsTable();
  const db = getDb();
  const result = await db`
    SELECT id, name, version, executed_at as "executedAt"
    FROM migrations
    ORDER BY version ASC
  `;

  return result.rows as Migration[];
}

/**
 * Record a migration execution
 *
 * Adds a new record to the migrations table to mark a migration as executed.
 *
 * @param name - Migration name/identifier (e.g., '001_create_users_table')
 * @param version - Version number for ordering migrations
 * @throws {DatabaseError} If migration is already recorded (unique constraint)
 * @throws {DatabaseError} If insert fails
 */
export async function recordMigration(
  name: string,
  version: number,
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO migrations (name, version)
    VALUES (${name}, ${version})
  `;
}

/**
 * Check if a migration has been executed
 *
 * Returns true if a migration with the given name has already been executed.
 *
 * @param name - Migration name to check
 * @returns true if migration exists, false otherwise
 * @throws {DatabaseError} If query fails
 */
export async function isMigrationExecuted(name: string): Promise<boolean> {
  const db = getDb();
  const result = await db`
    SELECT id FROM migrations WHERE name = ${name} LIMIT 1
  `;

  return result.rows.length > 0;
}
