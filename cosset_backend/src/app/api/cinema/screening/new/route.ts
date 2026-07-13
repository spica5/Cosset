import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCinemaFilmScreening } from 'src/models/cinema-film-screenings';
import { getCinemaFilmById } from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const screening = body?.screening;
    const filmId = Number.parseInt(String(screening?.filmId || ''), 10);
    const customerId = String(screening?.customerId || '').trim();

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (Number.isNaN(filmId)) {
      return response({ message: 'filmId is required' }, STATUS.BAD_REQUEST);
    }

    if (!screening?.showAt) {
      return response({ message: 'showAt is required' }, STATUS.BAD_REQUEST);
    }

    const film = await getCinemaFilmById(filmId);

    if (!film) {
      return response({ message: 'Film not found' }, STATUS.BAD_REQUEST);
    }

    if (film.customerId !== customerId) {
      return response({ message: 'Film not found' }, STATUS.NOT_FOUND);
    }

    const created = await createCinemaFilmScreening({
      filmId,
      customerId,
      showAt: screening.showAt,
      showEndAt: screening.showEndAt ?? null,
      order: screening.order ?? null,
      isPublic: screening.isPublic ?? 1,
    });

    return response({ screening: created }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Screening - Create', error as Error);
  }
}
