import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'post_reactions';

export const POST_REACTION_TARGET_TYPES = ['blog', 'album', 'collection', 'drawer'] as const;
export const POST_REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;

export type PostReactionTargetType = (typeof POST_REACTION_TARGET_TYPES)[number];
export type PostReactionType = (typeof POST_REACTION_TYPES)[number];

export interface PostReaction {
  id: number;
  targetId: number;
  customerId: number;
  targetType: PostReactionTargetType;
  reactionType: PostReactionType;
  viewedAt: Date;
  createdAt: Date;
}

export interface PostReactionSummary {
  targetType: PostReactionTargetType;
  targetId: number;
  totalCount: number;
  counts: Record<PostReactionType, number>;
  myReaction: PostReactionType | null;
}

let ensurePostReactionsTablePromise: Promise<void> | null = null;

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeCount = (value: number | string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
};

const createEmptyReactionCounts = (): Record<PostReactionType, number> => {
  const counts = {} as Record<PostReactionType, number>;

  POST_REACTION_TYPES.forEach((reactionType) => {
    counts[reactionType] = 0;
  });

  return counts;
};

const ensurePostReactionsTable = async (): Promise<void> => {
  if (!ensurePostReactionsTablePromise) {
    ensurePostReactionsTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            target_id BIGINT NOT NULL,
            customer_id BIGINT NOT NULL,
            target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('blog', 'album', 'collection', 'drawer')),
            reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
            viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_post_reaction UNIQUE (target_type, target_id, customer_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_post_reactions_target ON ${TABLE_NAME} (target_type, target_id)`,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_post_reactions_customer ON ${TABLE_NAME} (customer_id)`,
      );
    })().catch((error) => {
      ensurePostReactionsTablePromise = null;
      throw error;
    });
  }

  await ensurePostReactionsTablePromise;
};

export async function setPostReaction(params: {
  targetType: PostReactionTargetType;
  targetId: number;
  customerId: number;
  reactionType: PostReactionType;
}): Promise<PostReaction> {
  try {
    await ensurePostReactionsTable();

    const targetId = toInteger(params.targetId);
    const customerId = toInteger(params.customerId);

    if (targetId === null || customerId === null) {
      throw new DatabaseError({
        code: 'INVALID_REACTION_IDENTIFIERS',
        message: 'targetId and customerId must be valid integers',
      });
    }

    const reaction = await queryOne<PostReaction>(
      `
        INSERT INTO ${TABLE_NAME} (
          target_id,
          customer_id,
          target_type,
          reaction_type,
          viewed_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (target_type, target_id, customer_id)
        DO UPDATE SET
          reaction_type = EXCLUDED.reaction_type,
          viewed_at = NOW()
        RETURNING
          id,
          target_id as "targetId",
          customer_id as "customerId",
          target_type as "targetType",
          reaction_type as "reactionType",
          viewed_at as "viewedAt",
          created_at as "createdAt"
      `,
      [targetId, customerId, params.targetType, params.reactionType],
    );

    if (!reaction) {
      throw new DatabaseError({
        code: 'SET_REACTION_FAILED',
        message: 'Failed to create or update reaction',
      });
    }

    return reaction;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'SET_REACTION_ERROR',
        message: `Failed to set reaction: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function removePostReaction(params: {
  targetType: PostReactionTargetType;
  targetId: number;
  customerId: number;
}): Promise<boolean> {
  try {
    await ensurePostReactionsTable();

    const targetId = toInteger(params.targetId);
    const customerId = toInteger(params.customerId);

    if (targetId === null || customerId === null) {
      throw new DatabaseError({
        code: 'INVALID_REACTION_IDENTIFIERS',
        message: 'targetId and customerId must be valid integers',
      });
    }

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE target_type = $1
          AND target_id = $2
          AND customer_id = $3
        RETURNING id
      `,
      [params.targetType, targetId, customerId],
    );

    return !!deleted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'REMOVE_REACTION_ERROR',
        message: `Failed to remove reaction: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getPostReaction(
  targetType: PostReactionTargetType,
  targetId: number,
  customerId: number,
): Promise<PostReaction | null> {
  try {
    await ensurePostReactionsTable();

    return await queryOne<PostReaction>(
      `
        SELECT
          id,
          target_id as "targetId",
          customer_id as "customerId",
          target_type as "targetType",
          reaction_type as "reactionType",
          viewed_at as "viewedAt",
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE target_type = $1
          AND target_id = $2
          AND customer_id = $3
        LIMIT 1
      `,
      [targetType, targetId, customerId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_REACTION_ERROR',
        message: `Failed to fetch reaction: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}

export async function getPostReactionSummary(
  targetType: PostReactionTargetType,
  targetId: number,
  customerId?: number,
): Promise<PostReactionSummary> {
  try {
    await ensurePostReactionsTable();

    const normalizedTargetId = toInteger(targetId);

    if (normalizedTargetId === null) {
      throw new DatabaseError({
        code: 'INVALID_TARGET_ID',
        message: 'targetId must be a valid integer',
      });
    }

    type ReactionCountRow = {
      reactionType: PostReactionType;
      count: number | string;
    };

    const rows = await queryMany<ReactionCountRow>(
      `
        SELECT
          reaction_type as "reactionType",
          COUNT(*)::int as "count"
        FROM ${TABLE_NAME}
        WHERE target_type = $1
          AND target_id = $2
        GROUP BY reaction_type
      `,
      [targetType, normalizedTargetId],
    );

    const counts = createEmptyReactionCounts();
    let totalCount = 0;

    rows.forEach((row) => {
      const count = normalizeCount(row.count);
      counts[row.reactionType] = count;
      totalCount += count;
    });

    let myReaction: PostReactionType | null = null;

    if (customerId !== undefined && customerId !== null) {
      const normalizedCustomerId = toInteger(customerId);

      if (normalizedCustomerId !== null) {
        const existing = await getPostReaction(targetType, normalizedTargetId, normalizedCustomerId);
        myReaction = existing?.reactionType ?? null;
      }
    }

    return {
      targetType,
      targetId: normalizedTargetId,
      totalCount,
      counts,
      myReaction,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_REACTION_SUMMARY_ERROR',
        message: `Failed to fetch reaction summary: ${error.message}`,
        detail: error.detail,
      });
    }

    throw error;
  }
}
