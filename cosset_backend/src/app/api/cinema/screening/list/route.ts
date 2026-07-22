import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCinemaFilmScreeningsByCategory,
  getCinemaFilmScreeningsByFilmIds,
} from 'src/models/cinema-film-screenings';
import { normalizeCinemaCategory } from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId')?.trim() || '';
    const category = normalizeCinemaCategory(searchParams.get('category'));
    const filmId = searchParams.get('filmId');
    const publicOnly = searchParams.get('publicOnly') === '1';

    if (filmId) {
      const parsedFilmId = Number.parseInt(filmId, 10);

      if (Number.isNaN(parsedFilmId)) {
        return response({ message: 'Invalid filmId' }, STATUS.BAD_REQUEST);
      }

      const screenings = await getCinemaFilmScreeningsByFilmIds([parsedFilmId], { publicOnly });

      return response({ screenings }, STATUS.OK);
    }

    if (!customerId && !publicOnly) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (!category) {
      return response({ message: 'category must be classic, genre, or drama' }, STATUS.BAD_REQUEST);
    }

    const screenings = await getCinemaFilmScreeningsByCategory(
      customerId || null,
      category,
      { publicOnly },
    );

    return response({ screenings }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Screening - Get list', error as Error);
  }
}
