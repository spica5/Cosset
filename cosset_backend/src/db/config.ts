/**
 * Database Configuration Module
 *
 * Manages Neon database configuration for Vercel serverless environment.
 * The connection string is loaded from the DATABASE_URL environment variable.
 *
 * @module db/config
 */

/**
 * Database configuration constants for Neon serverless
 *
 * @constant
 * @type {Object}
 */
export const DB_CONFIG = {
  /**
   * Neon database connection string from environment
   * Must be set in Vercel Environment Variables
   */
  CONNECTION_STRING: process.env.DATABASE_URL || '',

  /**
   * Pool configuration optimized for Vercel serverless
   * - max: 1 - Serverless functions should use minimal connections
   */
  POOL_CONFIG: {
    max: 1,
  },
} as const;

/**
 * Validates that database connection is properly configured
 *
 * Throws an error if DATABASE_URL environment variable is not set.
 * Call this during application initialization to fail fast.
 *
 * @throws {Error} If DATABASE_URL is not configured
 *
 * @example
 * ```ts
 * import { validateDatabaseConfig } from '@/db/config';
 *
 * // Call during app startup
 * validateDatabaseConfig();
 * ```
 */
export function validateDatabaseConfig(): void {
  if (!DB_CONFIG.CONNECTION_STRING) {
    throw new Error(
      'DATABASE_URL environment variable is not configured. '
      + 'Please add your Neon database connection string to your environment variables.',
    );
  }
}
