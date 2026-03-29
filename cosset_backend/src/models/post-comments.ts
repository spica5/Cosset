import { DatabaseError } from '@/db/errors';
import { executeQuery, queryMany, queryOne } from '@/db/neon';

const TABLE_NAME = 'post_comments';
const USERS_TABLE_NAME = 'cosset_users';
const ALLOWED_TARGET_TYPES = ['blog', 'album', 'collection', 'collection-item', 'drawer', 'community'] as const;

type PostCommentTargetType = (typeof ALLOWED_TARGET_TYPES)[number];

export interface PostComment {
  id: number;
  targetId: number;
  customerId?: string | null;
  prevCustomer?: string | null;
  targetType: PostCommentTargetType;
  comment: string;
  visible?: boolean | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerDisplayName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  createdAt?: Date | null;
}

let ensurePostCommentsTablePromise: Promise<void> | null = null;

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

const normalizeTargetType = (value: unknown): PostCommentTargetType => {
  if (typeof value !== 'string') {
    return 'community';
  }

  const normalized = value.trim().toLowerCase();
  if ((ALLOWED_TARGET_TYPES as readonly string[]).includes(normalized)) {
    return normalized as PostCommentTargetType;
  }

  return 'community';
};

const ensurePostCommentsTable = async (): Promise<void> => {
  if (!ensurePostCommentsTablePromise) {
    ensurePostCommentsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            target_id BIGINT NOT NULL,
            customer_id UUID,
            prev_customer UUID,
            target_type VARCHAR(20) NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_post_comments_target ON ${TABLE_NAME} (target_type, target_id, created_at DESC)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_post_comments_customer ON ${TABLE_NAME} (customer_id)`,
      );
    })().catch((error) => {
      ensurePostCommentsTablePromise = null;
      throw error;
    });
  }

  await ensurePostCommentsTablePromise;
};

export async function getPostComments(
  targetId: number,
  targetType: PostCommentTargetType = 'community',
  limit: number = 100,
  offset: number = 0,
): Promise<PostComment[]> {
  try {
    await ensurePostCommentsTable();

    const normalizedTargetId = parseInteger(targetId);

    if (normalizedTargetId === null) {
      throw new DatabaseError({
        code: 'INVALID_TARGET_ID',
        message: 'targetId must be a valid integer',
      });
    }

    const normalizedLimit = Math.max(1, Math.min(300, parseInteger(limit) ?? 100));
    const normalizedOffset = Math.max(0, parseInteger(offset) ?? 0);

    return await queryMany<PostComment>(
      `
        SELECT
          pc.id,
          pc.target_id as "targetId",
          pc.customer_id as "customerId",
          pc.prev_customer as "prevCustomer",
          pc.target_type as "targetType",
          pc.comment,
          pc.visible,
          cu.first_name as "customerFirstName",
          cu.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
            cu.email,
            'Customer'
          ) as "customerDisplayName",
          cu.email as "customerEmail",
          cu.photo_url as "customerPhotoURL",
          pc.created_at as "createdAt"
        FROM ${TABLE_NAME} pc
        LEFT JOIN ${USERS_TABLE_NAME} cu ON cu.id = pc.customer_id
        WHERE pc.target_type = $1
          AND pc.target_id = $2
        ORDER BY pc.created_at ASC
        LIMIT $3 OFFSET $4
      `,
      [normalizeTargetType(targetType), normalizedTargetId, normalizedLimit, normalizedOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_POST_COMMENTS_ERROR',
        message: `Failed to fetch post comments: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getLatestPostCommentCustomerId(
  targetId: number,
  targetType: PostCommentTargetType = 'community',
): Promise<string | null> {
  try {
    await ensurePostCommentsTable();

    const normalizedTargetId = parseInteger(targetId);

    if (normalizedTargetId === null) {
      throw new DatabaseError({
        code: 'INVALID_TARGET_ID',
        message: 'targetId must be a valid integer',
      });
    }

    const row = await queryOne<{ customerId?: string | null }>(
      `
        SELECT
          pc.customer_id as "customerId"
        FROM ${TABLE_NAME} pc
        WHERE pc.target_type = $1
          AND pc.target_id = $2
        ORDER BY pc.created_at DESC, pc.id DESC
        LIMIT 1
      `,
      [normalizeTargetType(targetType), normalizedTargetId],
    );

    return row?.customerId ?? null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_LATEST_POST_COMMENT_CUSTOMER_ERROR',
        message: `Failed to fetch latest post comment customer: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function createPostComment(params: {
  targetId: number;
  customerId?: string | null;
  prevCustomer?: string | null;
  targetType?: PostCommentTargetType | string;
  comment: string;
}): Promise<PostComment> {
  try {
    await ensurePostCommentsTable();

    const normalizedTargetId = parseInteger(params.targetId);
    const normalizedComment = typeof params.comment === 'string' ? params.comment.trim() : '';

    if (normalizedTargetId === null) {
      throw new DatabaseError({
        code: 'INVALID_TARGET_ID',
        message: 'targetId must be a valid integer',
      });
    }

    if (!normalizedComment) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT',
        message: 'comment is required',
      });
    }

    const created = await queryOne<{ id: number }>(
      `
        INSERT INTO ${TABLE_NAME} (
          target_id,
          customer_id,
          prev_customer,
          target_type,
          comment,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `,
      [
        normalizedTargetId,
        params.customerId ?? null,
        params.prevCustomer ?? null,
        normalizeTargetType(params.targetType),
        normalizedComment,
      ],
    );

    if (!created?.id) {
      throw new DatabaseError({
        code: 'CREATE_POST_COMMENT_FAILED',
        message: 'Failed to create post comment',
      });
    }

    const inserted = await queryOne<PostComment>(
      `
        SELECT
          pc.id,
          pc.target_id as "targetId",
          pc.customer_id as "customerId",
          pc.prev_customer as "prevCustomer",
          pc.target_type as "targetType",
          pc.comment,
          pc.visible,
          cu.first_name as "customerFirstName",
          cu.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
            cu.email,
            'Customer'
          ) as "customerDisplayName",
          cu.email as "customerEmail",
          cu.photo_url as "customerPhotoURL",
          pc.created_at as "createdAt"
        FROM ${TABLE_NAME} pc
        LEFT JOIN ${USERS_TABLE_NAME} cu ON cu.id = pc.customer_id
        WHERE pc.id = $1
        LIMIT 1
      `,
      [created.id],
    );

    if (!inserted) {
      throw new DatabaseError({
        code: 'CREATE_POST_COMMENT_FAILED',
        message: 'Created comment could not be reloaded',
      });
    }

    return inserted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_POST_COMMENT_ERROR',
        message: `Failed to create post comment: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getPostCommentById(commentId: number): Promise<PostComment | null> {
  try {
    await ensurePostCommentsTable();

    const normalizedCommentId = parseInteger(commentId);

    if (normalizedCommentId === null) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT_ID',
        message: 'commentId must be a valid integer',
      });
    }

    const row = await queryOne<PostComment>(
      `
        SELECT
          pc.id,
          pc.target_id as "targetId",
          pc.customer_id as "customerId",
          pc.prev_customer as "prevCustomer",
          pc.target_type as "targetType",
          pc.comment,
          pc.visible,
          cu.first_name as "customerFirstName",
          cu.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
            cu.email,
            'Customer'
          ) as "customerDisplayName",
          cu.email as "customerEmail",
          cu.photo_url as "customerPhotoURL",
          pc.created_at as "createdAt"
        FROM ${TABLE_NAME} pc
        LEFT JOIN ${USERS_TABLE_NAME} cu ON cu.id = pc.customer_id
        WHERE pc.id = $1
        LIMIT 1
      `,
      [normalizedCommentId],
    );

    return row ?? null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_POST_COMMENT_BY_ID_ERROR',
        message: `Failed to fetch post comment: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function deletePostCommentById(commentId: number): Promise<boolean> {
  try {
    await ensurePostCommentsTable();

    const normalizedCommentId = parseInteger(commentId);

    if (normalizedCommentId === null) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT_ID',
        message: 'commentId must be a valid integer',
      });
    }

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [normalizedCommentId],
    );

    return !!deleted?.id;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_POST_COMMENT_ERROR',
        message: `Failed to delete post comment: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function updatePostCommentVisibility(
  commentId: number,
  visible: boolean,
): Promise<PostComment | null> {
  try {
    await ensurePostCommentsTable();

    const normalizedCommentId = parseInteger(commentId);

    if (normalizedCommentId === null) {
      throw new DatabaseError({
        code: 'INVALID_COMMENT_ID',
        message: 'commentId must be a valid integer',
      });
    }

    const normalizedVisible = visible ? 1 : 0;

    const updated = await queryOne<PostComment>(
      `
        UPDATE ${TABLE_NAME}
        SET visible = $1
        WHERE id = $2
        RETURNING
          id,
          target_id as "targetId",
          customer_id as "customerId",
          prev_customer as "prevCustomer",
          target_type as "targetType",
          comment,
          visible,
          created_at as "createdAt"
      `,
      [normalizedVisible, normalizedCommentId],
    );

    if (!updated) {
      return null;
    }

    const withUserInfo = await queryOne<PostComment>(
      `
        SELECT
          pc.id,
          pc.target_id as "targetId",
          pc.customer_id as "customerId",
          pc.prev_customer as "prevCustomer",
          pc.target_type as "targetType",
          pc.comment,
          pc.visible,
          cu.first_name as "customerFirstName",
          cu.last_name as "customerLastName",
          COALESCE(
            NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
            cu.email,
            'Customer'
          ) as "customerDisplayName",
          cu.email as "customerEmail",
          cu.photo_url as "customerPhotoURL",
          pc.created_at as "createdAt"
        FROM ${TABLE_NAME} pc
        LEFT JOIN ${USERS_TABLE_NAME} cu ON cu.id = pc.customer_id
        WHERE pc.id = $1
        LIMIT 1
      `,
      [normalizedCommentId],
    );

    return withUserInfo ?? null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_POST_COMMENT_VISIBILITY_ERROR',
        message: `Failed to update post comment visibility: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
