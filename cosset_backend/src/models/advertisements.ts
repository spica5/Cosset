import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const TABLE_NAME = 'advertisements';

export const ADVERTISEMENT_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
export type AdvertisementStatus = (typeof ADVERTISEMENT_STATUSES)[number];

export const ADVERTISEMENT_MEDIA_TYPES = ['text', 'image', 'video', 'mixed'] as const;
export type AdvertisementMediaType = (typeof ADVERTISEMENT_MEDIA_TYPES)[number];

export interface Advertisement {
  id: number;
  title: string;
  bodyText?: string | null;
  mediaType: AdvertisementMediaType;
  imageKey?: string | null;
  videoKey?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  placement?: string | null;
  status: AdvertisementStatus;
  priority: number;
  companyName: string;
  companyWebsite?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyLogoKey?: string | null;
  companyNotes?: string | null;
  startAt?: Date | null;
  endAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export type AdvertisementInput = {
  title: string;
  bodyText?: string | null;
  mediaType?: AdvertisementMediaType | string | null;
  imageKey?: string | null;
  videoKey?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  placement?: string | null;
  status?: AdvertisementStatus | string | null;
  priority?: number | null;
  companyName: string;
  companyWebsite?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyLogoKey?: string | null;
  companyNotes?: string | null;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
};

let ensureTablePromise: Promise<void> | null = null;

const SELECT_COLUMNS = `
  id,
  title,
  body_text as "bodyText",
  media_type as "mediaType",
  image_key as "imageKey",
  video_key as "videoKey",
  cta_label as "ctaLabel",
  cta_url as "ctaUrl",
  placement,
  status,
  priority,
  company_name as "companyName",
  company_website as "companyWebsite",
  company_email as "companyEmail",
  company_phone as "companyPhone",
  company_logo_key as "companyLogoKey",
  company_notes as "companyNotes",
  start_at as "startAt",
  end_at as "endAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

function normalizeNullableString(value: unknown, max = 2000): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, max);
}

function normalizeStatus(value: unknown): AdvertisementStatus {
  const status = String(value || 'draft')
    .trim()
    .toLowerCase();
  return (ADVERTISEMENT_STATUSES as readonly string[]).includes(status)
    ? (status as AdvertisementStatus)
    : 'draft';
}

function normalizeMediaType(value: unknown): AdvertisementMediaType {
  const mediaType = String(value || 'text')
    .trim()
    .toLowerCase();
  return (ADVERTISEMENT_MEDIA_TYPES as readonly string[]).includes(mediaType)
    ? (mediaType as AdvertisementMediaType)
    : 'text';
}

function normalizePriority(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-1000, Math.min(1000, Math.trunc(parsed)));
}

function normalizeDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function ensureAdvertisementsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id BIGSERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            body_text TEXT NULL,
            media_type VARCHAR(32) NOT NULL DEFAULT 'text',
            image_key TEXT NULL,
            video_key TEXT NULL,
            cta_label VARCHAR(120) NULL,
            cta_url TEXT NULL,
            placement VARCHAR(120) NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'draft',
            priority INTEGER NOT NULL DEFAULT 0,
            company_name VARCHAR(255) NOT NULL,
            company_website TEXT NULL,
            company_email VARCHAR(255) NULL,
            company_phone VARCHAR(64) NULL,
            company_logo_key TEXT NULL,
            company_notes TEXT NULL,
            start_at TIMESTAMP NULL,
            end_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_advertisements_status ON ${TABLE_NAME} (status)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_advertisements_company ON ${TABLE_NAME} (company_name)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON ${TABLE_NAME} (placement)`,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function getAllAdvertisements(
  limit = 100,
  offset = 0,
): Promise<Advertisement[]> {
  try {
    await ensureAdvertisementsTable();

    const safeLimit = Math.max(1, Math.min(300, Math.trunc(limit) || 100));
    const safeOffset = Math.max(0, Math.trunc(offset) || 0);

    return await queryMany<Advertisement>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        ORDER BY priority DESC, updated_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
      [safeLimit, safeOffset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError({
      code: 'GET_ADVERTISEMENTS_ERROR',
      message: `Failed to list advertisements: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getAdvertisementById(id: number): Promise<Advertisement | null> {
  try {
    await ensureAdvertisementsTable();

    return await queryOne<Advertisement>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError({
      code: 'GET_ADVERTISEMENT_ERROR',
      message: `Failed to get advertisement: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function createAdvertisement(input: AdvertisementInput): Promise<Advertisement> {
  try {
    await ensureAdvertisementsTable();

    const title = normalizeNullableString(input.title, 255);
    const companyName = normalizeNullableString(input.companyName, 255);

    if (!title) {
      throw new DatabaseError({ code: 'INVALID_TITLE', message: 'title is required' });
    }
    if (!companyName) {
      throw new DatabaseError({ code: 'INVALID_COMPANY', message: 'companyName is required' });
    }

    const created = await queryOne<Advertisement>(
      `
        INSERT INTO ${TABLE_NAME} (
          title,
          body_text,
          media_type,
          image_key,
          video_key,
          cta_label,
          cta_url,
          placement,
          status,
          priority,
          company_name,
          company_website,
          company_email,
          company_phone,
          company_logo_key,
          company_notes,
          start_at,
          end_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
        )
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        title,
        normalizeNullableString(input.bodyText, 10000),
        normalizeMediaType(input.mediaType),
        normalizeNullableString(input.imageKey, 1000),
        normalizeNullableString(input.videoKey, 1000),
        normalizeNullableString(input.ctaLabel, 120),
        normalizeNullableString(input.ctaUrl, 1000),
        normalizeNullableString(input.placement, 120),
        normalizeStatus(input.status),
        normalizePriority(input.priority),
        companyName,
        normalizeNullableString(input.companyWebsite, 1000),
        normalizeNullableString(input.companyEmail, 255),
        normalizeNullableString(input.companyPhone, 64),
        normalizeNullableString(input.companyLogoKey, 1000),
        normalizeNullableString(input.companyNotes, 5000),
        normalizeDate(input.startAt),
        normalizeDate(input.endAt),
      ],
    );

    if (!created) {
      throw new DatabaseError({
        code: 'CREATE_ADVERTISEMENT_ERROR',
        message: 'Failed to create advertisement',
      });
    }

    return created;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError({
      code: 'CREATE_ADVERTISEMENT_ERROR',
      message: `Failed to create advertisement: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateAdvertisement(
  id: number,
  input: Partial<AdvertisementInput>,
): Promise<Advertisement> {
  try {
    await ensureAdvertisementsTable();

    const existing = await getAdvertisementById(id);
    if (!existing) {
      throw new DatabaseError({ code: 'NOT_FOUND', message: 'Advertisement not found' });
    }

    const title =
      input.title !== undefined
        ? normalizeNullableString(input.title, 255)
        : existing.title;
    const companyName =
      input.companyName !== undefined
        ? normalizeNullableString(input.companyName, 255)
        : existing.companyName;

    if (!title) {
      throw new DatabaseError({ code: 'INVALID_TITLE', message: 'title is required' });
    }
    if (!companyName) {
      throw new DatabaseError({ code: 'INVALID_COMPANY', message: 'companyName is required' });
    }

    const updated = await queryOne<Advertisement>(
      `
        UPDATE ${TABLE_NAME}
        SET
          title = $2,
          body_text = $3,
          media_type = $4,
          image_key = $5,
          video_key = $6,
          cta_label = $7,
          cta_url = $8,
          placement = $9,
          status = $10,
          priority = $11,
          company_name = $12,
          company_website = $13,
          company_email = $14,
          company_phone = $15,
          company_logo_key = $16,
          company_notes = $17,
          start_at = $18,
          end_at = $19,
          updated_at = NOW()
        WHERE id = $1
        RETURNING ${SELECT_COLUMNS}
      `,
      [
        id,
        title,
        input.bodyText !== undefined
          ? normalizeNullableString(input.bodyText, 10000)
          : existing.bodyText ?? null,
        input.mediaType !== undefined
          ? normalizeMediaType(input.mediaType)
          : existing.mediaType,
        input.imageKey !== undefined
          ? normalizeNullableString(input.imageKey, 1000)
          : existing.imageKey ?? null,
        input.videoKey !== undefined
          ? normalizeNullableString(input.videoKey, 1000)
          : existing.videoKey ?? null,
        input.ctaLabel !== undefined
          ? normalizeNullableString(input.ctaLabel, 120)
          : existing.ctaLabel ?? null,
        input.ctaUrl !== undefined
          ? normalizeNullableString(input.ctaUrl, 1000)
          : existing.ctaUrl ?? null,
        input.placement !== undefined
          ? normalizeNullableString(input.placement, 120)
          : existing.placement ?? null,
        input.status !== undefined ? normalizeStatus(input.status) : existing.status,
        input.priority !== undefined
          ? normalizePriority(input.priority)
          : existing.priority,
        companyName,
        input.companyWebsite !== undefined
          ? normalizeNullableString(input.companyWebsite, 1000)
          : existing.companyWebsite ?? null,
        input.companyEmail !== undefined
          ? normalizeNullableString(input.companyEmail, 255)
          : existing.companyEmail ?? null,
        input.companyPhone !== undefined
          ? normalizeNullableString(input.companyPhone, 64)
          : existing.companyPhone ?? null,
        input.companyLogoKey !== undefined
          ? normalizeNullableString(input.companyLogoKey, 1000)
          : existing.companyLogoKey ?? null,
        input.companyNotes !== undefined
          ? normalizeNullableString(input.companyNotes, 5000)
          : existing.companyNotes ?? null,
        input.startAt !== undefined ? normalizeDate(input.startAt) : existing.startAt ?? null,
        input.endAt !== undefined ? normalizeDate(input.endAt) : existing.endAt ?? null,
      ],
    );

    if (!updated) {
      throw new DatabaseError({
        code: 'UPDATE_ADVERTISEMENT_ERROR',
        message: 'Failed to update advertisement',
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError({
      code: 'UPDATE_ADVERTISEMENT_ERROR',
      message: `Failed to update advertisement: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteAdvertisement(id: number): Promise<boolean> {
  try {
    await ensureAdvertisementsTable();

    const deleted = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return Boolean(deleted?.id);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError({
      code: 'DELETE_ADVERTISEMENT_ERROR',
      message: `Failed to delete advertisement: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
