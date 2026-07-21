/**
 * Database Configuration Module
 *
 * Manages Neon database configuration for Vercel serverless environment.
 * The connection string is loaded from the DATABASE_URL environment variable.
 *
 * @module db/config
 */

function resolveNeonConnectionString(raw: string): string {
  const poolerOverride = process.env.DATABASE_URL_POOLER?.trim();
  if (poolerOverride) {
    return poolerOverride;
  }

  if (!raw || raw.includes('-pooler.')) {
    return raw;
  }

  return raw.replace(
    /@([a-z0-9-]+)(\.[^/?]+\.neon\.tech)/i,
    (_match, host: string, rest: string) =>
      host.endsWith('-pooler') ? `@${host}${rest}` : `@${host}-pooler${rest}`,
  );
}

/**
 * Database configuration constants for Neon serverless
 *
 * @constant
 * @type {Object}
 */
export const DB_CONFIG = {
  /**
   * Neon database connection string from environment.
   * Automatically prefers the Neon pooler host when available.
   */
  CONNECTION_STRING: resolveNeonConnectionString(process.env.DATABASE_URL || ''),

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
 */
export function validateDatabaseConfig(): void {
  if (!DB_CONFIG.CONNECTION_STRING) {
    const errorMsg = 'DATABASE_URL environment variable is not configured. '
      + 'Please add your Neon database connection string to your environment variables.';
    console.error(errorMsg);
    console.error('Available environment variables:', {
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      hasNODE_ENV: !!process.env.NODE_ENV,
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error(errorMsg);
  }
}
