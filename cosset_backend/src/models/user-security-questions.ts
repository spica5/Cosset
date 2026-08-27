import bcrypt from 'bcryptjs';
import { DatabaseError } from '@/db/errors';
import { queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'user_security_questions';

export const SECURITY_QUESTION_CATALOG = [
  { id: 'childhood_street', prompt: 'What was the name of the street you grew up on?' },
  { id: 'first_pet', prompt: 'What was the name of your first pet?' },
  { id: 'city_born', prompt: 'In what city were you born?' },
  { id: 'mother_maiden', prompt: "What is your mother's maiden name?" },
  { id: 'first_school', prompt: 'What was the name of your first school?' },
  { id: 'favorite_teacher', prompt: 'What was the name of your favorite teacher?' },
  { id: 'childhood_nickname', prompt: 'What was your childhood nickname?' },
  { id: 'first_car', prompt: 'What was the make of your first car?' },
  { id: 'best_friend', prompt: 'What is the first name of your childhood best friend?' },
  { id: 'favorite_food', prompt: 'What is your favorite childhood food?' },
] as const;

export type SecurityQuestionId = (typeof SECURITY_QUESTION_CATALOG)[number]['id'];

const VALID_QUESTION_IDS = new Set<string>(SECURITY_QUESTION_CATALOG.map((q) => q.id));

let ensureTablePromise: Promise<void> | null = null;

const ensureSecurityQuestionsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            question_id VARCHAR(64) NOT NULL,
            answer_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, question_id)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_security_questions_user_id ON ${TABLE_NAME} (user_id)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export function normalizeSecurityAnswer(answer: string): string {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isValidSecurityQuestionId(questionId: string): questionId is SecurityQuestionId {
  return VALID_QUESTION_IDS.has(questionId);
}

export function getSecurityQuestionPrompt(questionId: string): string | null {
  const found = SECURITY_QUESTION_CATALOG.find((q) => q.id === questionId);
  return found?.prompt || null;
}

export type SecurityQuestionRow = {
  questionId: string;
  answerHash: string;
};

export async function getUserSecurityQuestions(userId: string): Promise<SecurityQuestionRow[]> {
  await ensureSecurityQuestionsTable();

  try {
    return await queryMany<SecurityQuestionRow>(
      `
        SELECT
          question_id as "questionId",
          answer_hash as "answerHash"
        FROM ${TABLE_NAME}
        WHERE user_id = $1
        ORDER BY question_id ASC
      `,
      [userId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_SECURITY_QUESTIONS_ERROR',
        message: `Failed to fetch security questions: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getUserSecurityQuestionCount(userId: string): Promise<number> {
  const rows = await getUserSecurityQuestions(userId);
  return rows.length;
}

export async function replaceUserSecurityQuestions(
  userId: string,
  questions: Array<{ questionId: string; answer: string }>,
): Promise<void> {
  await ensureSecurityQuestionsTable();

  if (questions.length < 3) {
    throw new DatabaseError({
      code: 'INVALID_SECURITY_QUESTIONS',
      message: 'At least 3 security questions are required.',
    });
  }

  const seen = new Set<string>();
  questions.forEach((item) => {
    if (!isValidSecurityQuestionId(item.questionId)) {
      throw new DatabaseError({
        code: 'INVALID_SECURITY_QUESTION_ID',
        message: `Unknown security question: ${item.questionId}`,
      });
    }
    if (seen.has(item.questionId)) {
      throw new DatabaseError({
        code: 'DUPLICATE_SECURITY_QUESTION',
        message: 'Each security question can only be selected once.',
      });
    }
    seen.add(item.questionId);

    const normalized = normalizeSecurityAnswer(item.answer);
    if (normalized.length < 2) {
      throw new DatabaseError({
        code: 'INVALID_SECURITY_ANSWER',
        message: 'Each security answer must be at least 2 characters.',
      });
    }
  });

  try {
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE user_id = $1`, [userId]);

    const hashedQuestions = await Promise.all(
      questions.map(async (item) => ({
        questionId: item.questionId,
        answerHash: await bcrypt.hash(normalizeSecurityAnswer(item.answer), 10),
      })),
    );

    await Promise.all(
      hashedQuestions.map((item) =>
        executeQuery(
          `
            INSERT INTO ${TABLE_NAME} (user_id, question_id, answer_hash)
            VALUES ($1, $2, $3)
          `,
          [userId, item.questionId, item.answerHash],
        ),
      ),
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'REPLACE_USER_SECURITY_QUESTIONS_ERROR',
      message: `Failed to save security questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

export async function verifyUserSecurityAnswers(
  userId: string,
  answers: Array<{ questionId: string; answer: string }>,
): Promise<boolean> {
  const stored = await getUserSecurityQuestions(userId);

  if (stored.length < 3) {
    return false;
  }

  if (answers.length < 3) {
    return false;
  }

  const byId = new Map(stored.map((row) => [row.questionId, row.answerHash]));

  const results = await Promise.all(
    answers.map(async (item) => {
      const hash = byId.get(item.questionId);
      if (!hash) {
        return false;
      }
      return bcrypt.compare(normalizeSecurityAnswer(item.answer), hash);
    }),
  );

  return results.length >= 3 && results.every(Boolean);
}
