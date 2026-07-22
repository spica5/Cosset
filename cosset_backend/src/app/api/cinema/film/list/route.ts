import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getCinemaFilms, normalizeCinemaCategory } from 'src/models/cinema-films';
import { getCinemaFilmScreeningsByFilmIds } from 'src/models/cinema-film-screenings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId')?.trim() || '';
    const category = normalizeCinemaCategory(searchParams.get('category'));
    const publicOnly = searchParams.get('publicOnly') === '1';

    if (!customerId && !publicOnly) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (!category) {
      return response({ message: 'category must be classic, genre, or drama' }, STATUS.BAD_REQUEST);
    }

    const films = await getCinemaFilms(customerId || null, category, { publicOnly });
    const screenings = await getCinemaFilmScreeningsByFilmIds(
      films.map((film) => film.id),
      { publicOnly },
    );

    const screeningsByFilmId = screenings.reduce<Record<number, typeof screenings>>((acc, screening) => {
      if (!acc[screening.filmId]) {
        acc[screening.filmId] = [];
      }

      acc[screening.filmId].push(screening);
      return acc;
    }, {});

    const filmsWithScreenings = films.map((film) => ({
      ...film,
      screenings: screeningsByFilmId[film.id] || [],
    }));

    return response({ films: filmsWithScreenings }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Film - Get list', error as Error);
  }
}
