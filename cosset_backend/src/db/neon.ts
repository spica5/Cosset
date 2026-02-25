/**
 * Database Query Handler Module
 *
 * Provides a high-level interface to execute SQL queries against a Neon PostgreSQL database.
 * Handles connection management, error handling, and result transformation.
 *
 * Features:
 * - Automatic connection caching
 * - Support for both string-based and tagged-template queries
 * - Type-safe query results
 * - Comprehensive error handling
 * - Built-in health checks
 *
 * @module db/neon
 */

import type { FullQueryResults, NeonQueryFunction } from '@neondatabase/serverless';

import { neon } from '@neondatabase/serverless';

import { handleDatabaseError } from './errors';
import { DB_CONFIG, validateDatabaseConfig } from './config';

import type { QueryResult } from './types';

/**
 * Neon query function with object results and full metadata
 * - ArrayMode = false: rows are returned as objects
 * - FullResults = true: includes rows, rowCount, and command metadata
 */
type Db = NeonQueryFunction<false, true>;
type DbFullResult = FullQueryResults<false>;

let dbConnection: Db | null = null;

/**
 * Initialize or retrieve cached database connection
 *
 * Creates a Neon database connection on first call and caches it for reuse.
 * Validates configuration before initialization.
 *
 * @returns Neon query function instance
 * @throws {Error} If DATABASE_URL is not configured
 *
 * @internal
 */
function initializeDb(): Db {
  validateDatabaseConfig();

  if (!dbConnection) {
    const connectionString = DB_CONFIG.CONNECTION_STRING;
    try {
      dbConnection = neon<false, true>(connectionString, {
        fullResults: true,
      });
    } catch (error) {
      console.error('Failed to initialize database connection:', {
        error,
        hasConnectionString: !!connectionString,
        connectionStringLength: connectionString?.length || 0,
      });
      throw new Error(
        `Failed to initialize database connection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return dbConnection;
}

/**
 * Execute a parameterized SQL query with explicit parameters
 *
 * Use this function when you have a query string and separate parameters array.
 * Parameters should use $1, $2, etc. placeholders for proper parameterization.
 *
 * @template T - Type of rows returned by the query
 * @param queryText - SQL query string with $1, $2, ... placeholders
 * @param params - Array of parameter values (optional)
 * @returns Query result containing rows and metadata
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { executeQuery } from '@/db/neon';
 *
 * interface User { id: string; name: string; }
 *
 * const result = await executeQuery<User>(
 *   'SELECT id, name FROM users WHERE id = $1',
 *   ['user-123']
 * );
 *
 * console.log(result.rows); // User[]
 * console.log(result.rowCount); // number
 * ```
 */
export async function executeQuery<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    const db = initializeDb();

    // For manually parameterized queries, use .query()
    const result: DbFullResult = await db.query(queryText, params, {
      fullResults: true,
    });

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? (result.rows as T[]).length,
      command: result.command,
    };
  } catch (error) {
    console.error('Database query failed:', {
      queryLength: queryText.length,
      paramCount: params.length,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    throw handleDatabaseError(error);
  }
}

/**
 * Execute a query using Neon's tagged template syntax
 *
 * This is the recommended approach. The Neon client automatically handles
 * parameterization using template literals with ${...} placeholders.
 *
 * @template T - Type of rows returned by the query
 * @param queryPromise - Promise from a tagged template query
 * @returns Query result containing rows and metadata
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { getDb, executeTagged } from '@/db/neon';
 *
 * interface User { id: string; name: string; }
 *
 * const db = getDb();
 * const result = await executeTagged<User>(
 *   db`SELECT id, name FROM users WHERE id = ${userId}`
 * );
 *
 * console.log(result.rows); // User[]
 * ```
 */
export async function executeTagged<T = Record<string, unknown>>(
  queryPromise: Promise<DbFullResult>,
): Promise<QueryResult<T>> {
  try {
    const result = await queryPromise;

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? (result.rows as T[]).length,
      command: result.command,
    };
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

export async function queryOne<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await executeQuery<T>(queryText, params);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows
 *
 * Convenience function that executes a query and returns all rows.
 * Returns an empty array if no rows are found.
 *
 * @template T - Type of rows
 * @param queryText - SQL query string with $1, $2, ... placeholders
 * @param params - Array of parameter values (optional)
 * @returns Array of rows (empty array if none found)
 * @throws {DatabaseError} If query execution fails
 */
export async function queryMany<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await executeQuery<T>(queryText, params);
  return result.rows;
}

/**
 * Get the raw Neon database client instance
 *
 * Use this to execute queries directly with Neon's tagged template syntax.
 *
 * @returns Neon query function instance
 */
export function getDb(): Db {
  return initializeDb();
}

/**
 * Check database connection health
 *
 * Performs a simple query to verify the database connection is working.
 * Useful for health checks in monitoring endpoints.
 *
 * @returns true if connection is healthy, false otherwise (never throws)
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const db = getDb();
    const result = await executeTagged(db`SELECT 1 as healthy`);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Close database connection
 *
 * Clears the cached connection. Rarely needed in serverless environments
 * but useful for cleanup during testing or graceful shutdown.
 */
export function closeDb(): void {
  dbConnection = null;
}