import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCinemaFilmById,
  updateCinemaFilm,
  deleteCinemaFilm,
  normalizeCinemaCategory,
} from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const filmId = Number.parseInt(id, 10);

    if (Number.isNaN(filmId)) {
      return response({ message: 'Invalid film id' }, STATUS.BAD_REQUEST);
    }

    const film = await getCinemaFilmById(filmId);

    if (!film) {
      return response({ message: 'Film not found' }, STATUS.NOT_FOUND);
    }

    return response({ film }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Film - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const filmId = Number.parseInt(id, 10);

    if (Number.isNaN(filmId)) {
      return response({ message: 'Invalid film id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.videoUrl !== undefined && !String(updates.videoUrl).trim()) {
      return response({ message: 'Video URL is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.category !== undefined && !normalizeCinemaCategory(updates.category)) {
      return response({ message: 'category must be classic, genre, or drama' }, STATUS.BAD_REQUEST);
    }

    const film = await updateCinemaFilm(filmId, {
      category: updates.category,
      title: updates.title,
      director: updates.director,
      year: updates.year,
      description: updates.description,
      posterImage: updates.posterImage,
      videoUrl: updates.videoUrl,
      order: updates.order,
      isPublic: updates.isPublic,
    });

    return response({ film }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Film - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const filmId = Number.parseInt(id, 10);

    if (Number.isNaN(filmId)) {
      return response({ message: 'Invalid film id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCinemaFilm(filmId);

    if (!deleted) {
      return response({ message: 'Film not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Film deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Film - Delete', error as Error);
  }
}
