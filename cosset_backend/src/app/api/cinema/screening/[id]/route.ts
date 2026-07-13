import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getCinemaFilmScreeningById,
  updateCinemaFilmScreening,
  deleteCinemaFilmScreening,
} from 'src/models/cinema-film-screenings';
import { getCinemaFilmById } from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const screeningId = Number.parseInt(id, 10);

    if (Number.isNaN(screeningId)) {
      return response({ message: 'Invalid screening id' }, STATUS.BAD_REQUEST);
    }

    const screening = await getCinemaFilmScreeningById(screeningId);

    if (!screening) {
      return response({ message: 'Screening not found' }, STATUS.NOT_FOUND);
    }

    return response({ screening }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Screening - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const screeningId = Number.parseInt(id, 10);

    if (Number.isNaN(screeningId)) {
      return response({ message: 'Invalid screening id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.filmId !== undefined) {
      const filmId = Number.parseInt(String(updates.filmId), 10);

      if (Number.isNaN(filmId)) {
        return response({ message: 'Invalid filmId' }, STATUS.BAD_REQUEST);
      }

      const film = await getCinemaFilmById(filmId);

      if (!film) {
        return response({ message: 'Film not found' }, STATUS.BAD_REQUEST);
      }
    }

    const screening = await updateCinemaFilmScreening(screeningId, {
      filmId: updates.filmId,
      showAt: updates.showAt,
      showEndAt: updates.showEndAt,
      order: updates.order,
      isPublic: updates.isPublic,
    });

    return response({ screening }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Screening - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const screeningId = Number.parseInt(id, 10);

    if (Number.isNaN(screeningId)) {
      return response({ message: 'Invalid screening id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCinemaFilmScreening(screeningId);

    if (!deleted) {
      return response({ message: 'Screening not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Screening deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Screening - Delete', error as Error);
  }
}
