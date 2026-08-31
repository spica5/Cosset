import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'site_settings';

export const INTRO_VIDEO_SETTING_KEY = 'intro_video';

export type IntroVideoSetting = {
  videoKey: string | null;
  videoUrl: string | null;
  title: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

type SiteSettingRow = {
  key: string;
  value: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
};

let ensureTablePromise: Promise<void> | null = null;

const ensureSiteSettingsTable = async (): Promise<void> => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID NULL
          )
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const parseIntroVideoValue = (raw: string | null): IntroVideoSetting => {
  if (!raw) {
    return {
      videoKey: null,
      videoUrl: null,
      title: null,
      updatedAt: null,
      updatedBy: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IntroVideoSetting>;
    return {
      videoKey: typeof parsed.videoKey === 'string' ? parsed.videoKey : null,
      videoUrl: typeof parsed.videoUrl === 'string' ? parsed.videoUrl : null,
      title: typeof parsed.title === 'string' ? parsed.title : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : null,
    };
  } catch {
    // Legacy: raw string stored as storage key or URL
    const value = raw.trim();
    const isUrl = /^https?:\/\//i.test(value);
    return {
      videoKey: isUrl ? null : value || null,
      videoUrl: isUrl ? value : null,
      title: null,
      updatedAt: null,
      updatedBy: null,
    };
  }
};

export async function getIntroVideoSetting(): Promise<IntroVideoSetting> {
  try {
    await ensureSiteSettingsTable();

    const row = await queryOne<SiteSettingRow>(
      `
        SELECT
          key,
          value,
          updated_at as "updatedAt",
          updated_by as "updatedBy"
        FROM ${TABLE_NAME}
        WHERE key = $1
      `,
      [INTRO_VIDEO_SETTING_KEY],
    );

    const parsed = parseIntroVideoValue(row?.value ?? null);
    return {
      ...parsed,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : parsed.updatedAt,
      updatedBy: row?.updatedBy ? String(row.updatedBy) : parsed.updatedBy,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'GET_INTRO_VIDEO_SETTING_ERROR',
      message: `Failed to load intro video setting: ${message}`,
    });
  }
}

export async function setIntroVideoSetting(input: {
  videoKey?: string | null;
  videoUrl?: string | null;
  title?: string | null;
  updatedBy?: string | null;
}): Promise<IntroVideoSetting> {
  try {
    await ensureSiteSettingsTable();

    const next: IntroVideoSetting = {
      videoKey: input.videoKey?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      title: input.title?.trim() || null,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy || null,
    };

    await executeQuery(
      `
        INSERT INTO ${TABLE_NAME} (key, value, updated_at, updated_by)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `,
      [INTRO_VIDEO_SETTING_KEY, JSON.stringify(next), input.updatedBy || null],
    );

    return next;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'SET_INTRO_VIDEO_SETTING_ERROR',
      message: `Failed to save intro video setting: ${message}`,
    });
  }
}
