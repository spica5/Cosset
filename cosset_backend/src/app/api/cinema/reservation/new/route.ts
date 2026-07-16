import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  cancelCinemaFilmReservation,
  createCinemaFilmReservation,
} from 'src/models/cinema-film-reservations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const screeningId = Number.parseInt(String(body?.screeningId ?? body?.reservation?.screeningId ?? ''), 10);
    const customerId = String(body?.customerId ?? body?.reservation?.customerId ?? '').trim();
    const seatIds = body?.seatIds ?? body?.reservation?.seatIds ?? [];

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (Number.isNaN(screeningId)) {
      return response({ message: 'screeningId is required' }, STATUS.BAD_REQUEST);
    }

    const reservation = await createCinemaFilmReservation({
      screeningId,
      customerId,
      seatIds: Array.isArray(seatIds) ? seatIds : [],
    });

    return response({ reservation }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === 'CINEMA_RESERVATION_EXISTS') {
        return response({ message: error.message }, STATUS.CONFLICT);
      }

      if (
        error.code === 'CINEMA_RESERVATION_SCREENING_NOT_FOUND' ||
        error.code === 'INVALID_CINEMA_RESERVATION_SCREENING' ||
        error.code === 'INVALID_CINEMA_RESERVATION_CUSTOMER' ||
        error.code === 'INVALID_CINEMA_RESERVATION_SEATS'
      ) {
        return response({ message: error.message }, STATUS.BAD_REQUEST);
      }
    }

    return handleError('Cinema Reservation - Create', error as Error);
  }
}
