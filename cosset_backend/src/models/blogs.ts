/**
 * Blogs Model
 *
 * Provides functions to query and manage blogs in the database.
 *
 * @module models/blogs
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const TABLE_NAME = 'blogs';
const DEFAULT_FONT_PRESET = 'classic-serif';
const DEFAULT_BACKGROUND_PRESET = 'letter-paper';

let ensureBlogStyleColumnsPromise: Promise<void> | null = null;

const normalizePreset = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return fallback;
};

const ensureBlogStyleColumns = async (): Promise<void> => {
  if (!ensureBlogStyleColumnsPromise) {
    ensureBlogStyleColumnsPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS font_preset VARCHAR(80) DEFAULT '${DEFAULT_FONT_PRESET}'`,
      );

      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS background_preset VARCHAR(80) DEFAULT '${DEFAULT_BACKGROUND_PRESET}'`,
      );
    })().catch((error) => {
      ensureBlogStyleColumnsPromise = null;
      throw error;
    });
  }

  await ensureBlogStyleColumnsPromise;
};

export interface Blog {
  id: number;
  customerId?: string | null;
  title?: string | null;
  category?: number | null;
  description?: string | null;
  content?: string | null;
  file?: string | null;
  isPublic?: number | null;
  totalViews?: number | null;
  following?: number | null;
  fontPreset?: string | null;
  backgroundPreset?: string | null;
  comments?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

const normalizeSmallInt = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return fallback;
};

const normalizeNullableSmallInt = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeSmallInt(value, 0);
};

const normalizeBigInt = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

/**
 * Get all blogs with pagination
 */
export async function getAllBlogs(
  customerId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Blog[]> {
  try {
    await ensureBlogStyleColumns();

    let query = `
      SELECT
        id,
        customer_id as "customerId",
        title,
        category,
        description,
        content,
        file,
        "public" as "isPublic",
        total_views as "totalViews",
        following,
        font_preset as "fontPreset",
        background_preset as "backgroundPreset",
        comments,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ${TABLE_NAME}
    `;
    const params: unknown[] = [];

    if (customerId !== undefined && customerId !== null) {
      query += ` WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(customerId, limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    return await queryMany<Blog>(query, params);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_BLOGS_ERROR',
        message: `Failed to fetch blogs: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get blog by ID
 */
export async function getBlogById(id: number): Promise<Blog | null> {
  try {
    await ensureBlogStyleColumns();

    const blog = await queryOne<Blog>(
      `
        SELECT
          id,
          customer_id as "customerId",
          title,
          category,
          description,
          content,
          file,
          "public" as "isPublic",
          total_views as "totalViews",
          following,
          font_preset as "fontPreset",
          background_preset as "backgroundPreset",
          comments,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return blog;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_BLOG_ERROR',
        message: `Failed to fetch blog: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Create a new blog
 */
export async function createBlog(
  blog: Omit<Blog, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Blog> {
  try {
    await ensureBlogStyleColumns();

    const createdBlog = await queryOne<Blog>(
      `
        INSERT INTO ${TABLE_NAME} (
          customer_id,
          title,
          category,
          description,
          content,
          file,
          "public",
          total_views,
          following,
          font_preset,
          background_preset,
          comments,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING
          id,
          customer_id as "customerId",
          title,
          category,
          description,
          content,
          file,
          "public" as "isPublic",
          total_views as "totalViews",
          following,
          font_preset as "fontPreset",
          background_preset as "backgroundPreset",
          comments,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        blog.customerId ?? null,
        blog.title ?? null,
        normalizeNullableSmallInt(blog.category),
        blog.description ?? null,
        blog.content ?? null,
        blog.file ?? null,
        normalizeSmallInt(blog.isPublic, 0),
        normalizeBigInt(blog.totalViews, 0),
        normalizeBigInt(blog.following, 0),
        normalizePreset(blog.fontPreset, DEFAULT_FONT_PRESET),
        normalizePreset(blog.backgroundPreset, DEFAULT_BACKGROUND_PRESET),
        blog.comments ?? null,
      ],
    );

    if (!createdBlog) {
      throw new DatabaseError({
        code: 'CREATE_BLOG_FAILED',
        message: 'Failed to create blog: No data returned',
      });
    }

    return createdBlog;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_BLOG_ERROR',
        message: `Failed to create blog: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update an existing blog.
 * Only provided fields are updated.
 */
export async function updateBlog(
  id: number,
  updates: Partial<Omit<Blog, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Blog> {
  try {
    await ensureBlogStyleColumns();

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if ('customerId' in updates) {
      setClauses.push(`customer_id = $${paramIndex}`);
      params.push(updates.customerId ?? null);
      paramIndex += 1;
    }
    if ('title' in updates) {
      setClauses.push(`title = $${paramIndex}`);
      params.push(updates.title ?? null);
      paramIndex += 1;
    }
    if ('category' in updates) {
      setClauses.push(`category = $${paramIndex}`);
      params.push(normalizeNullableSmallInt(updates.category));
      paramIndex += 1;
    }
    if ('description' in updates) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(updates.description ?? null);
      paramIndex += 1;
    }
    if ('content' in updates) {
      setClauses.push(`content = $${paramIndex}`);
      params.push(updates.content ?? null);
      paramIndex += 1;
    }
    if ('file' in updates) {
      setClauses.push(`file = $${paramIndex}`);
      params.push(updates.file ?? null);
      paramIndex += 1;
    }
    if ('isPublic' in updates) {
      setClauses.push(`"public" = $${paramIndex}`);
      params.push(normalizeSmallInt(updates.isPublic, 0));
      paramIndex += 1;
    }
    if ('totalViews' in updates) {
      setClauses.push(`total_views = $${paramIndex}`);
      params.push(normalizeBigInt(updates.totalViews, 0));
      paramIndex += 1;
    }
    if ('following' in updates) {
      setClauses.push(`following = $${paramIndex}`);
      params.push(normalizeBigInt(updates.following, 0));
      paramIndex += 1;
    }
    if ('fontPreset' in updates) {
      setClauses.push(`font_preset = $${paramIndex}`);
      params.push(normalizePreset(updates.fontPreset, DEFAULT_FONT_PRESET));
      paramIndex += 1;
    }
    if ('backgroundPreset' in updates) {
      setClauses.push(`background_preset = $${paramIndex}`);
      params.push(normalizePreset(updates.backgroundPreset, DEFAULT_BACKGROUND_PRESET));
      paramIndex += 1;
    }
    if ('comments' in updates) {
      setClauses.push(`comments = $${paramIndex}`);
      params.push(updates.comments ?? null);
      paramIndex += 1;
    }

    if (setClauses.length === 0) {
      const existing = await getBlogById(id);
      if (!existing) {
        throw new DatabaseError({
          code: 'BLOG_NOT_FOUND',
          message: `Blog ${id} not found`,
        });
      }
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const updated = await queryOne<{ id: number }>(
      `
        UPDATE ${TABLE_NAME}
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `,
      params,
    );

    if (!updated?.id) {
      throw new DatabaseError({
        code: 'UPDATE_BLOG_FAILED',
        message: `Blog ${id} not found`,
      });
    }

    const hydratedBlog = await getBlogById(updated.id);

    if (!hydratedBlog) {
      throw new DatabaseError({
        code: 'UPDATE_BLOG_FAILED',
        message: `Blog ${id} could not be reloaded`,
      });
    }

    return hydratedBlog;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_BLOG_ERROR',
        message: `Failed to update blog: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Delete a blog by ID.
 */
export async function deleteBlog(id: number): Promise<boolean> {
  try {
    const deleted = await queryOne<{ id: number }>(
      `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING id`,
      [id],
    );

    return !!deleted;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_BLOG_ERROR',
        message: `Failed to delete blog: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
