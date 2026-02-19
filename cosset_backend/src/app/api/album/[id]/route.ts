import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { deleteAlbum, updateAlbum, getAlbumById } from 'src/models/albums';

// ----------------------------------------------------------------------

// Disable Next.js route caching for this API (GET /api/albums/:id).
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Get album by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);

    const album = await getAlbumById(albumId);

    if (!album) {
      return response({ message: 'Album not found' }, STATUS.NOT_FOUND);
    }

    return response({ album }, STATUS.OK);
  } catch (error) {
    return handleError('Album - Get', error as Error);
  }
}

/**
 * Update album
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);
    const body = await req.json();
    const album = body?.album;

    if (!album) {
      return response({ message: 'Album data is required' }, STATUS.BAD_REQUEST);
    }

    const updatedAlbum = await updateAlbum(albumId, {
      title: album.title,
      description: album.description ?? null,
      coverUrl: album.coverUrl ?? null,
      category: album.category ?? null,
      openness: album.openness ?? null,
      priority: album.priority ?? null,
      totalViews: album.totalViews ?? null,
    });

    return response({ album: updatedAlbum }, STATUS.OK);
  } catch (error) {
    return handleError('Album - Update', error as Error);
  }
}

/**
 * Delete album
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);

    const deleted = await deleteAlbum(albumId);

    if (!deleted) {
      return response({ message: 'Album not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Album deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Album - Delete', error as Error);
  }
}

