/**
 * Blogs Model
 *
 * Provides functions to query and manage blogs in the database.
 *
 * @module models/blogs
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

const TABLE_NAME = 'blogs';

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
          comments,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
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
