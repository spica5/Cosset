/**
 * Database Utilities Barrel Export
 *
 * Central export point for all database-related utilities.
 * Import from '@/db' to access all database functionality.
 *
 * @module db
 *
 * @example
 * ```ts
 * import {
 *   getDb,
 *   queryOne,
 *   queryMany,
 *   isDatabaseHealthy,
 *   validateDatabaseConfig,
 * } from '@/db';
 *
 * // Validate configuration on startup
 * validateDatabaseConfig();
 *
 * // Use query functions
 * const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
 * const users = await queryMany('SELECT * FROM users LIMIT $1', [10]);
 *
 * // Check health
 * const isHealthy = await isDatabaseHealthy();
 *
 * // Access raw client
 * const db = getDb();
 * const result = await db`SELECT * FROM users WHERE id = ${id}`;\n * ```
 */

// Configuration
export { DB_CONFIG, validateDatabaseConfig } from './config';

// Types
export type { QueryError, QueryResult, DatabaseTransaction } from './types';

// Error handling
export { isQueryError, DatabaseError, createQueryError, handleDatabaseError } from './errors';

// Query execution
export {
  getDb,
  closeDb,
  queryOne,
  queryMany,
  executeQuery,
  executeTagged,
  isDatabaseHealthy,
} from './neon';
