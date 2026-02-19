/**
 * Album Images Model
 *
 * Provides functions to query and manage album images in the database.
 *
 * @module models/album-images
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

/**
 * Table name for album images
 */
const TABLE_NAME = 'album_images';

/**
 * Album image record from the database
 */
export interface AlbumImage {
  /** Unique identifier */
  id: number;
  /** Album ID (foreign key to albums) */
  albumId: number;
  /** Image title */
  imageTitle?: string;
  /** File URL (storage identifier) */
  fileUrl?: string;
  /** Image effect */
  effect?: string;
  /** MIME type */
  mimeType?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** File size in bytes */
  bytes?: number;
  /** Display position/order */
  position?: number;
  /** Image description */
  description?: string;
  /** Image category */
  category?: string;
  /** Creation timestamp */
  createdAt?: Date;
}

/**
 * Get image by ID
 *
 * @param id - Image ID
 * @returns Image object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function getImageById(id: number): Promise<AlbumImage | null> {
  try {
    const image = await queryOne<AlbumImage>(
      `
        SELECT
          id,
          album_id as "albumId",
          image_title as "imageTitle",
          file_url as "fileUrl",
          effect,
          mime_type as "mimeType",
          width,
          height,
          bytes,
          position,
          description,
          category,
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
      `,
      [id],
    );

    return image;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_IMAGE_ERROR',
        message: `Failed to fetch image: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get all images for an album
 *
 * @param albumId - Album ID
 * @returns Array of images ordered by position
 * @throws {DatabaseError} If query execution fails
 */
export async function getImagesByAlbumId(albumId: number): Promise<AlbumImage[]> {
  try {
    const images = await queryMany<AlbumImage>(
      `
        SELECT
          id,
          album_id as "albumId",
          image_title as "imageTitle",
          file_url as "fileUrl",
          effect,
          mime_type as "mimeType",
          width,
          height,
          bytes,
          position,
          description,
          category,
          created_at as "createdAt"
        FROM ${TABLE_NAME}
        WHERE album_id = $1
        ORDER BY position ASC NULLS LAST, created_at ASC
      `,
      [albumId],
    );

    return images;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_IMAGES_ERROR',
        message: `Failed to fetch images: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Create a new album image
 *
 * @param image - Image data to insert
 * @returns The created image object
 * @throws {DatabaseError} If query execution fails
 */
export async function createAlbumImage(
  image: Omit<AlbumImage, 'id' | 'createdAt'>,
): Promise<AlbumImage> {
  try {
    const createdImage = await queryOne<AlbumImage>(
      `
        INSERT INTO ${TABLE_NAME} (
          album_id,
          image_title,
          file_url,
          effect,
          mime_type,
          width,
          height,
          bytes,
          position,
          description,
          category,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING
          id,
          album_id as "albumId",
          image_title as "imageTitle",
          file_url as "fileUrl",
          effect,
          mime_type as "mimeType",
          width,
          height,
          bytes,
          position,
          description,
          category,
          created_at as "createdAt"
      `,
      [
        image.albumId,
        image.imageTitle || null,
        image.fileUrl || null,
        image.effect || null,
        image.mimeType || null,
        image.width || null,
        image.height || null,
        image.bytes || null,
        image.position || null,
        image.description || null,
        image.category || null,
      ],
    );

    if (!createdImage) {
      throw new DatabaseError({
        code: 'CREATE_IMAGE_FAILED',
        message: 'Failed to create image: No data returned',
      });
    }

    return createdImage;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_IMAGE_ERROR',
        message: `Failed to create image: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Delete an album image
 *
 * @param id - Image ID
 * @returns true if image was deleted, false if not found
 * @throws {DatabaseError} If query execution fails
 */
export async function deleteAlbumImage(id: number): Promise<boolean> {
  try {
    const result = await queryOne<{ id: number }>(
      `
        DELETE FROM ${TABLE_NAME}
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    return !!result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'DELETE_IMAGE_ERROR',
        message: `Failed to delete image: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update image position
 *
 * @param id - Image ID
 * @param position - New position
 * @returns The updated image object
 * @throws {DatabaseError} If query execution fails
 */
export async function updateImagePosition(id: number, position: number): Promise<AlbumImage> {
  try {
    const updatedImage = await queryOne<AlbumImage>(
      `
        UPDATE ${TABLE_NAME}
        SET position = $1
        WHERE id = $2
        RETURNING
          id,
          album_id as "albumId",
          image_title as "imageTitle",
          file_url as "fileUrl",
          effect,
          mime_type as "mimeType",
          width,
          height,
          bytes,
          position,
          description,
          category,
          created_at as "createdAt"
      `,
      [position, id],
    );

    if (!updatedImage) {
      throw new DatabaseError({
        code: 'UPDATE_IMAGE_FAILED',
        message: 'Failed to update image: No data returned',
      });
    }

    return updatedImage;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_IMAGE_ERROR',
        message: `Failed to update image: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

