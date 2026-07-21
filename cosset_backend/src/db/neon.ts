/**
 * Database Query Handler Module
 *
 * Provides a high-level interface to execute SQL queries against a Neon PostgreSQL database.
 * Handles connection management, error handling, and result transformation.
 *
 * @module db/neon
 */

import type { FullQueryResults, NeonQueryFunction } from '@neondatabase/serverless';

import { Pool, neon, neonConfig } from '@neondatabase/serverless';

import { handleDatabaseError } from './errors';
import { DB_CONFIG, validateDatabaseConfig } from './config';

import type { QueryResult } from './types';

type DbHttp = NeonQueryFunction<false, true>;
type DbFullResult = FullQueryResults<false>;

const QUERY_RETRY_ATTEMPTS = 5;
const QUERY_RETRY_BASE_DELAY_MS = 500;

let poolConnection: Pool | null = null;
let httpConnection: DbHttp | null = null;
let neonConfigured = false;

function configureNeonClient() {
  if (neonConfigured) {
    return;
  }

  neonConfigured = true;

  if (typeof globalThis.WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = globalThis.WebSocket;
  }

  // Prefer HTTP fetch for pool queries; more reliable than WebSocket on local dev networks.
  neonConfig.poolQueryViaFetch = true;
}

function shouldUsePoolConnection(): boolean {
  if (process.env.NEON_USE_HTTP === 'true') {
    return false;
  }

  // Pool/WebSocket connections to Neon are unreliable on local dev networks.
  if (process.env.NODE_ENV === 'development') {
    return false;
  }

  return typeof globalThis.WebSocket !== 'undefined';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorCauseMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '';
  }

  const { cause } = error as Error & { cause?: unknown };
  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === 'string') {
    return cause;
  }

  return '';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message} ${getErrorCauseMessage(error)}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function isTransientDatabaseError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('neondberror') ||
    message.includes('fetch failed') ||
    message.includes('aborterror') ||
    message.includes('other side closed') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('network') ||
    message.includes('temporarily unavailable') ||
    message.includes('connection terminated') ||
    message.includes('error connecting to database') ||
    message.includes('socket')
  );
}

async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  attempt = 1,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDatabaseError(error) || attempt >= QUERY_RETRY_ATTEMPTS) {
      throw error;
    }

    closeDb();

    const delayMs = QUERY_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn('Transient database connection error, retrying query:', {
      attempt,
      maxAttempts: QUERY_RETRY_ATTEMPTS,
      delayMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    await sleep(delayMs);
    return withDatabaseRetry(operation, attempt + 1);
  }
}

function initializePool(): Pool {
  validateDatabaseConfig();
  configureNeonClient();

  if (!poolConnection) {
    const maxConnections = Number.parseInt(process.env.NEON_POOL_MAX || '10', 10);

    poolConnection = new Pool({
      connectionString: DB_CONFIG.CONNECTION_STRING,
      max: Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : 5,
    });

    poolConnection.on('error', (error: Error) => {
      console.error('Neon pool connection error:', error);
      poolConnection = null;
    });
  }

  return poolConnection;
}

function initializeHttp(): DbHttp {
  validateDatabaseConfig();

  if (!httpConnection) {
    httpConnection = neon<false, true>(DB_CONFIG.CONNECTION_STRING, {
      fullResults: true,
    });
  }

  return httpConnection;
}

export function getDb(): DbHttp {
  return initializeHttp();
}

async function runHttpQuery(queryText: string, params: unknown[] = []): Promise<DbFullResult> {
  const db = initializeHttp();
  return db.query(queryText, params, {
    fullResults: true,
  });
}

async function runQuery(queryText: string, params: unknown[] = []): Promise<DbFullResult> {
  if (shouldUsePoolConnection()) {
    try {
      const pool = initializePool();
      const result = await pool.query(queryText, params);

      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        command: result.command ?? '',
      } as DbFullResult;
    } catch (error) {
      console.warn('Neon pool query failed, falling back to HTTP driver.', {
        errorMessage: getErrorMessage(error),
      });
      closeDb();
      return runHttpQuery(queryText, params);
    }
  }

  return runHttpQuery(queryText, params);
}

export async function executeQuery<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    const result: DbFullResult = await withDatabaseRetry(async () => runQuery(queryText, params));

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

export async function executeTagged<T = Record<string, unknown>>(
  queryFactory: () => Promise<DbFullResult>,
): Promise<QueryResult<T>> {
  try {
    const result = await withDatabaseRetry(queryFactory);

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

export async function queryMany<T = Record<string, unknown>>(
  queryText: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await executeQuery<T>(queryText, params);
  return result.rows;
}

export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const result = await executeQuery<{ healthy: number }>('SELECT 1 as healthy');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export function closeDb(): void {
  if (poolConnection) {
    const endingPool = poolConnection;
    poolConnection = null;
    endingPool.end().catch(() => undefined);
  }

  httpConnection = null;
}
