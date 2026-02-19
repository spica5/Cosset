import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createAlbum } from 'src/models/albums';

// ----------------------------------------------------------------------

export const runtime = 'nodejs';

/**
 * Create a new album
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const album = body?.album;

    if (!album || !album.title) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    const newAlbum = await createAlbum({
      userId: album.userId || null,
      title: album.title,
      description: album.description || null,
      coverUrl: album.coverUrl || null,
      category: album.category || null,
      openness: album.openness || null,
      priority: album.priority ?? null,
      totalViews: album.totalViews ?? null,
    });

    return response({ album: newAlbum }, STATUS.OK);
  } catch (error) {
    return handleError('Album - Create', error as Error);
  }
}

