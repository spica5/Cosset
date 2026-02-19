import type { QueryError } from './types';

/**
 * Custom error class for database query errors
 */
export class DatabaseError extends Error {
  public readonly code: string;

  public readonly detail?: string;

  public readonly hint?: string;

  public readonly tableName?: string;

  public readonly columnName?: string;

  constructor(error: QueryError | Error) {
    if (isQueryError(error)) {
      super(error.message);
      this.code = error.code;
      this.detail = error.detail;
      this.hint = error.hint;
      this.tableName = error.tableName;
      this.columnName = error.columnName;
    } else {
      super(error.message);
      this.code = 'UNKNOWN_ERROR';
    }
    this.name = 'DatabaseError';
  }
}

/**
 * Create a query error object
 */
export function createQueryError(
  code: string,
  message: string,
  details?: Partial<QueryError>,
): QueryError {
  return {
    code,
    message,
    ...details,
  };
}

/**
 * Type guard to check if error is a query error
 */
export function isQueryError(error: unknown): error is QueryError {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && 'message' in error
  );
}

/**
 * Handle and normalize database errors
 */
export function handleDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (isQueryError(error)) {
    return new DatabaseError(error);
  }

  if (error instanceof Error) {
    return new DatabaseError(error);
  }

  return new DatabaseError(
    new Error(`Unknown database error: ${JSON.stringify(error)}`),
  );
}
