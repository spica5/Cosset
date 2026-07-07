import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'journey_diary_memorial_thing_images';

export interface JourneyDiaryMemorialThingImage {
  id: number;
  memorialThingId: number;
  imageKey: string;
  sortOrder?: number | null;
  createdAt?: Date | string | null;
}

let ensureTablePromise: Promise<void> | null = null;

const ensureTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = executeQuery(
      `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id BIGSERIAL PRIMARY KEY,
          memorial_thing_id BIGINT NOT NULL,
          image_key TEXT NOT NULL,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
    )
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
};

const IMAGE_COLUMNS = `
  id,
  memorial_thing_id as "memorialThingId",
  image_key as "imageKey",
  sort_order as "sortOrder",
  created_at as "createdAt"
`;

export async function getJourneyDiaryMemorialThingImages(
  memorialThingId: number,
): Promise<JourneyDiaryMemorialThingImage[]> {
  try {
    await ensureTable();

    return await queryMany<JourneyDiaryMemorialThingImage>(
      `
        SELECT ${IMAGE_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE memorial_thing_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `,
      [memorialThingId],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_MEMORIAL_THING_IMAGES_ERROR',
        message: `Failed to fetch memorial thing images: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function getJourneyDiaryMemorialThingImagesByThingIds(
  memorialThingIds: number[],
): Promise<JourneyDiaryMemorialThingImage[]> {
  if (!memorialThingIds.length) {
    return [];
  }

  try {
    await ensureTable();

    return await queryMany<JourneyDiaryMemorialThingImage>(
      `
        SELECT ${IMAGE_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE memorial_thing_id = ANY($1::bigint[])
        ORDER BY memorial_thing_id ASC, sort_order ASC, created_at ASC
      `,
      [memorialThingIds],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_JOURNEY_DIARY_MEMORIAL_THING_IMAGES_BATCH_ERROR',
        message: `Failed to fetch memorial thing images: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function syncJourneyDiaryMemorialThingImages(
  memorialThingId: number,
  imageKeys: string[],
): Promise<JourneyDiaryMemorialThingImage[]> {
  try {
    await ensureTable();

    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE memorial_thing_id = $1`, [memorialThingId]);

    if (!imageKeys.length) {
      return [];
    }

    const rows = await Promise.all(
      imageKeys.map((imageKey, index) =>
        queryOne<JourneyDiaryMemorialThingImage>(
          `
          INSERT INTO ${TABLE_NAME} (
            memorial_thing_id,
            image_key,
            sort_order,
            created_at
          )
          VALUES ($1, $2, $3, NOW())
          RETURNING ${IMAGE_COLUMNS}
        `,
          [memorialThingId, imageKey, index],
        ),
      ),
    );

    return rows.filter((row): row is JourneyDiaryMemorialThingImage => Boolean(row));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'SYNC_JOURNEY_DIARY_MEMORIAL_THING_IMAGES_ERROR',
        message: `Failed to sync memorial thing images: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

export async function deleteJourneyDiaryMemorialThingImages(memorialThingId: number): Promise<void> {
  try {
    await ensureTable();
    await executeQuery(`DELETE FROM ${TABLE_NAME} WHERE memorial_thing_id = $1`, [memorialThingId]);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_JOURNEY_DIARY_MEMORIAL_THING_IMAGES_ERROR',
        message: `Failed to delete memorial thing images: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
