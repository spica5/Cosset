import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCinemaFilm, normalizeCinemaCategory } from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const film = body?.film;
    const category = normalizeCinemaCategory(film?.category);
    const customerId = String(film?.customerId || '').trim();

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (!category) {
      return response({ message: 'category must be classic, genre, or drama' }, STATUS.BAD_REQUEST);
    }

    if (!film?.title?.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!film?.videoUrl?.trim()) {
      return response({ message: 'Video URL is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createCinemaFilm({
      customerId,
      category,
      title: film.title.trim(),
      director: film.director ?? null,
      year: film.year ?? null,
      description: film.description ?? null,
      posterImage: film.posterImage ?? null,
      videoUrl: film.videoUrl.trim(),
      order: film.order ?? null,
      isPublic: film.isPublic ?? 1,
    });

    return response({ film: created }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Film - Create', error as Error);
  }
}
