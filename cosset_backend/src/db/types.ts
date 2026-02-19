/**
 * Type definitions for database operations
 */

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface QueryError {
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  context?: string;
  schemaName?: string;
  tableName?: string;
  columnName?: string;
  dataTypeName?: string;
  constraintName?: string;
  sourceFunction?: string;
  sourceLine?: string;
  sourceFile?: string;
}

export interface DatabaseTransaction {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}
