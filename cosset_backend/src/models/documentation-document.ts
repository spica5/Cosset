import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'documentation_document';

export type DocumentationCategory = 'study' | 'work' | 'life' | 'other';

export interface DocumentationDocument {
  id: number;
  customerId: string;
  title: string;
  description?: string | null;
  category?: DocumentationCategory | null;
  fileUrl: string;
  fileType: string;
  originalFileName?: string | null;
  fileSizeBytes: number;
  isFavorite?: number | null;
  order?: number | null;
  createdAt?: Date | null;
}

export interface DocumentationUsage {
  documentCount: number;
  totalBytes: number;
}

const SELECT_COLUMNS = `
  id,
  customer_id as "customerId",
  title,
  description,
  category,
  file_url as "fileUrl",
  file_type as "fileType",
  original_file_name as "originalFileName",
  file_size_bytes as "fileSizeBytes",
  is_favorite as "isFavorite",
  "order",
  created_at as "createdAt"
`;

let ensureTablePromise: Promise<void> | null = null;

const parseInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeCategory = (value: unknown): DocumentationCategory | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'study' || normalized === 'work' || normalized === 'life' || normalized === 'other') {
    return normalized;
  }
  return null;
};

const normalizeIsFavorite = (value: unknown): 0 | 1 => {
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' ? 1 : 0;
  }
  return 0;
};

const normalizeFileSizeBytes = (value: unknown): number => {
  const parsed = parseInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : 0;
};

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(32),
            file_url TEXT NOT NULL,
            file_type VARCHAR(32) NOT NULL DEFAULT 'file',
            original_file_name TEXT,
            file_size_bytes BIGINT NOT NULL DEFAULT 0,
            is_favorite SMALLINT NOT NULL DEFAULT 0,
            "order" INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_documentation_document_customer
         ON ${TABLE_NAME} (customer_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export async function getAllDocumentationDocuments(
  customerId?: string,
  limit: number = 200,
  offset: number = 0,
): Promise<DocumentationDocument[]> {
  try {
    await ensureTable();

    const normalizedCustomerId = String(customerId || '').trim();
    if (!normalizedCustomerId) {
      return [];
    }

    const normalizedLimit = Math.max(1, Math.min(500, parseInteger(limit) ?? 200));
    const normalizedOffset = Math.max(0, parseInteger(offset) ?? 0);

    return await queryMany<DocumentationDocument>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
        ORDER BY COALESCE("order", 2147483647) ASC, created_at DESC, id DESC
        LIMIT $2 OFFSET $3
      `,
      [normalizedCustomerId, normalizedLimit, normalizedOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_DOCUMENTATION_DOCUMENTS_ERROR',
        message: `Failed to fetch documentation documents: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getDocumentationDocumentById(
  id: number,
): Promise<DocumentationDocument | null> {
  try {
    await ensureTable();
    const normalizedId = parseInteger(id);
    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_DOCUMENT_ID',
        message: 'id must be a valid integer',
      });
    }

    return await queryOne<DocumentationDocument>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_DOCUMENTATION_DOCUMENT_ERROR',
        message: `Failed to fetch documentation document: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getDocumentationUsage(customerId: string): Promise<DocumentationUsage> {
  try {
    await ensureTable();
    const normalizedCustomerId = String(customerId || '').trim();
    if (!normalizedCustomerId) {
      return { documentCount: 0, totalBytes: 0 };
    }

    const row = await queryOne<{ documentCount: string | number; totalBytes: string | number }>(
      `
        SELECT
          COUNT(*)::bigint as "documentCount",
          COALESCE(SUM(file_size_bytes), 0)::bigint as "totalBytes"
        FROM ${TABLE_NAME}
        WHERE customer_id = $1
      `,
      [normalizedCustomerId],
    );

    return {
      documentCount: Number(row?.documentCount || 0),
      totalBytes: Number(row?.totalBytes || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_DOCUMENTATION_USAGE_ERROR',
        message: `Failed to fetch documentation usage: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function createDocumentationDocument(
  item: Omit<DocumentationDocument, 'id' | 'createdAt'>,
): Promise<DocumentationDocument> {
  try {
    await ensureTable();

    const customerId = String(item.customerId || '').trim();
    const title = String(item.title || '').trim();
    const fileUrl = String(item.fileUrl || '').trim();

    if (!customerId) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_CUSTOMER_ID',
        message: 'customerId is required',
      });
    }
    if (!title) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_TITLE',
        message: 'title is required',
      });
    }
    if (!fileUrl) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_FILE_URL',
        message: 'fileUrl is required',
      });
    }

    const created = await queryOne<DocumentationDocument>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          title,
          description,
          category,
          file_url,
          file_type,
          original_file_name,
          file_size_bytes,
          is_favorite,
          "order"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        customerId,
        title,
        item.description ?? null,
        normalizeCategory(item.category),
        fileUrl,
        String(item.fileType || 'file').trim().toLowerCase() || 'file',
        item.originalFileName ?? null,
        normalizeFileSizeBytes(item.fileSizeBytes),
        normalizeIsFavorite(item.isFavorite),
        parseInteger(item.order),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_DOCUMENTATION_DOCUMENT_ERROR',
        message: 'Failed to create documentation document',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'CREATE_DOCUMENTATION_DOCUMENT_ERROR',
      message: `Failed to create documentation document: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

export async function updateDocumentationDocument(
  id: number,
  updates: Partial<Omit<DocumentationDocument, 'id' | 'createdAt' | 'customerId'>>,
): Promise<DocumentationDocument | null> {
  try {
    await ensureTable();
    const normalizedId = parseInteger(id);
    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_DOCUMENT_ID',
        message: 'id must be a valid integer',
      });
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      const title = String(updates.title || '').trim();
      if (!title) {
        throw new DatabaseError({
          code: 'INVALID_DOCUMENTATION_TITLE',
          message: 'title is required',
        });
      }
      setClauses.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex += 1;
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(updates.description ?? null);
      paramIndex += 1;
    }

    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex}`);
      params.push(normalizeCategory(updates.category));
      paramIndex += 1;
    }

    if (updates.fileUrl !== undefined) {
      const fileUrl = String(updates.fileUrl || '').trim();
      if (!fileUrl) {
        throw new DatabaseError({
          code: 'INVALID_DOCUMENTATION_FILE_URL',
          message: 'fileUrl is required',
        });
      }
      setClauses.push(`file_url = $${paramIndex}`);
      params.push(fileUrl);
      paramIndex += 1;
    }

    if (updates.fileType !== undefined) {
      setClauses.push(`file_type = $${paramIndex}`);
      params.push(String(updates.fileType || 'file').trim().toLowerCase() || 'file');
      paramIndex += 1;
    }

    if (updates.originalFileName !== undefined) {
      setClauses.push(`original_file_name = $${paramIndex}`);
      params.push(updates.originalFileName ?? null);
      paramIndex += 1;
    }

    if (updates.fileSizeBytes !== undefined) {
      setClauses.push(`file_size_bytes = $${paramIndex}`);
      params.push(normalizeFileSizeBytes(updates.fileSizeBytes));
      paramIndex += 1;
    }

    if (updates.isFavorite !== undefined) {
      setClauses.push(`is_favorite = $${paramIndex}`);
      params.push(normalizeIsFavorite(updates.isFavorite));
      paramIndex += 1;
    }

    if (updates.order !== undefined) {
      setClauses.push(`"order" = $${paramIndex}`);
      params.push(parseInteger(updates.order));
      paramIndex += 1;
    }

    if (!setClauses.length) {
      return await getDocumentationDocumentById(normalizedId);
    }

    params.push(normalizedId);

    return await queryOne<DocumentationDocument>(
      `
        UPDATE ${TABLE_NAME}
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING ${SELECT_COLUMNS}
      `,
      params,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_DOCUMENTATION_DOCUMENT_ERROR',
      message: `Failed to update documentation document: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

export async function deleteDocumentationDocument(id: number): Promise<boolean> {
  try {
    await ensureTable();
    const normalizedId = parseInteger(id);
    if (normalizedId === null) {
      throw new DatabaseError({
        code: 'INVALID_DOCUMENTATION_DOCUMENT_ID',
        message: 'id must be a valid integer',
      });
    }

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [normalizedId],
    );

    return Boolean(deleted?.id);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'DELETE_DOCUMENTATION_DOCUMENT_ERROR',
      message: `Failed to delete documentation document: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}
