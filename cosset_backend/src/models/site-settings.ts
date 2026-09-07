import { DatabaseError } from '@/db/errors';
import { queryOne, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'site_settings';

export const INTRO_VIDEO_SETTING_KEY = 'intro_video';
export const TESTING_DISCLOSURE_SETTING_KEY = 'website_testing_disclosure';

export type IntroVideoSetting = {
  videoKey: string | null;
  videoUrl: string | null;
  title: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type WebsiteTestingDisclosureSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type WebsiteTestingDisclosureSetting = {
  title: string;
  intro: string;
  sections: WebsiteTestingDisclosureSection[];
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

const normalizeDisclosureSection = (value: unknown): WebsiteTestingDisclosureSection | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;

  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets.map((item) => String(item || '').trim()).filter(Boolean)
    : undefined;

  return {
    title,
    paragraphs,
    ...(bullets?.length ? { bullets } : {}),
  };
};

export const DEFAULT_TESTING_DISCLOSURE: Omit<
  WebsiteTestingDisclosureSetting,
  'updatedAt' | 'updatedBy'
> = {
  title: 'Website Testing Disclosure',
  intro: 'This website is currently in a testing and development phase.',
  sections: [
    {
      title: 'Testing purpose',
      paragraphs: [
        'This website and its features are being made available to a limited group of users for testing, evaluation, feedback, and development purposes only. The website has not yet been officially launched or released to the general public as a commercial service.',
        'By accessing or using this website, you acknowledge and agree that:',
      ],
      bullets: [
        'The website is currently under development and may contain bugs, errors, incomplete features, or temporary functionality.',
        'Features, content, accounts, data, and other aspects of the website may be changed, suspended, or removed at any time without prior notice.',
        'The website is provided for testing and evaluation purposes and should not be considered a fully launched or commercially available service.',
        'You should not rely on the website for critical, sensitive, or important activities during this testing period.',
        'Any content or information submitted during testing may be used by the development team for testing, debugging, improving, and evaluating the website.',
        'Access to the website may be restricted, suspended, or terminated at any time during the testing period.',
        'Unless otherwise stated, participation in the testing program does not create any employment, partnership, agency, investment, or other business relationship between you and the website operator.',
      ],
    },
    {
      title: 'No Commercial Transaction',
      paragraphs: [
        'Unless expressly stated otherwise, the testing phase does not involve the sale or purchase of goods or services. No payment is required to participate in the testing program, and no compensation is promised for participation or feedback.',
      ],
    },
    {
      title: 'Data Loss and Data Responsibility',
      paragraphs: [
        'The website is currently provided in a testing and development environment. During this period, data, documents, files, accounts, content, and other information submitted, uploaded, stored, or generated through the website may be subject to technical errors, system failures, testing activities, changes, suspension, or removal.',
        'To the fullest extent permitted by applicable law, the website operator does not guarantee the availability, integrity, preservation, or recovery of any data, documents, files, accounts, content, or other information submitted, uploaded, stored, or generated through the website during the testing period.',
        'Accordingly, you acknowledge and agree that:',
      ],
      bullets: [
        'You are responsible for maintaining your own backup copies of any important documents, files, data, or other information submitted to or stored on the website.',
        'The website operator is not responsible for any loss, deletion, corruption, alteration, unavailability, or inability to recover data, documents, files, accounts, content, or other information that may occur during the testing period, to the fullest extent permitted by applicable law.',
        'You should not use the website as the sole storage location for important, sensitive, or irreplaceable information during testing.',
        'The website operator does not guarantee that any data or content submitted during testing will be retained, preserved, or available after the testing period.',
        'You should not assume that data, documents, files, or other content will be recoverable if the website experiences technical problems, is modified, suspended, or discontinued.',
      ],
    },
    {
      title: 'Important Notice',
      paragraphs: [
        'This disclosure is intended to explain the current testing status and purpose of the website. It is not intended to waive or exclude any rights or obligations that cannot legally be waived or excluded under applicable law.',
        'By continuing to use the website, you confirm that you understand and agree that you are participating in a testing/development environment and that you should maintain your own backups of any important information submitted to or stored on the website.',
        'Thank you for helping us test and improve the platform.',
      ],
    },
  ],
};

const parseTestingDisclosureValue = (
  raw: string | null,
): Omit<WebsiteTestingDisclosureSetting, 'updatedAt' | 'updatedBy'> => {
  if (!raw) {
    return { ...DEFAULT_TESTING_DISCLOSURE, sections: [...DEFAULT_TESTING_DISCLOSURE.sections] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WebsiteTestingDisclosureSetting>;
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
          .map((section) => normalizeDisclosureSection(section))
          .filter((section): section is WebsiteTestingDisclosureSection => Boolean(section))
      : [];

    return {
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : DEFAULT_TESTING_DISCLOSURE.title,
      intro:
        typeof parsed.intro === 'string' && parsed.intro.trim()
          ? parsed.intro.trim()
          : DEFAULT_TESTING_DISCLOSURE.intro,
      sections: sections.length ? sections : [...DEFAULT_TESTING_DISCLOSURE.sections],
    };
  } catch {
    return { ...DEFAULT_TESTING_DISCLOSURE, sections: [...DEFAULT_TESTING_DISCLOSURE.sections] };
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

export async function getTestingDisclosureSetting(): Promise<WebsiteTestingDisclosureSetting> {
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
      [TESTING_DISCLOSURE_SETTING_KEY],
    );

    const parsed = parseTestingDisclosureValue(row?.value ?? null);
    return {
      ...parsed,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      updatedBy: row?.updatedBy ? String(row.updatedBy) : null,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'GET_TESTING_DISCLOSURE_SETTING_ERROR',
      message: `Failed to load testing disclosure setting: ${message}`,
    });
  }
}

export async function setTestingDisclosureSetting(input: {
  title: string;
  intro: string;
  sections: WebsiteTestingDisclosureSection[];
  updatedBy?: string | null;
}): Promise<WebsiteTestingDisclosureSetting> {
  try {
    await ensureSiteSettingsTable();

    const title = String(input.title || '').trim() || DEFAULT_TESTING_DISCLOSURE.title;
    const intro = String(input.intro || '').trim() || DEFAULT_TESTING_DISCLOSURE.intro;
    const sections = (input.sections || [])
      .map((section) => normalizeDisclosureSection(section))
      .filter((section): section is WebsiteTestingDisclosureSection => Boolean(section));

    if (!sections.length) {
      throw new DatabaseError({
        code: 'INVALID_TESTING_DISCLOSURE_SECTIONS',
        message: 'At least one disclosure section is required',
      });
    }

    const next: WebsiteTestingDisclosureSetting = {
      title,
      intro,
      sections,
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
      [TESTING_DISCLOSURE_SETTING_KEY, JSON.stringify(next), input.updatedBy || null],
    );

    return next;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseError({
      code: 'SET_TESTING_DISCLOSURE_SETTING_ERROR',
      message: `Failed to save testing disclosure setting: ${message}`,
    });
  }
}
