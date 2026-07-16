import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  cancelCinemaFilmReservation,
  getCinemaFilmReservationById,
  updateCinemaFilmReservationSeats,
} from 'src/models/cinema-film-reservations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservationId = Number.parseInt(id, 10);

    if (Number.isNaN(reservationId)) {
      return response({ message: 'Invalid reservation id' }, STATUS.BAD_REQUEST);
    }

    const reservation = await getCinemaFilmReservationById(reservationId);

    if (!reservation) {
      return response({ message: 'Reservation not found' }, STATUS.NOT_FOUND);
    }

    return response({ reservation }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Reservation - Get', error as Error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservationId = Number.parseInt(id, 10);
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || '').trim();
    const seatIds = body?.seatIds ?? [];

    if (Number.isNaN(reservationId)) {
      return response({ message: 'Invalid reservation id' }, STATUS.BAD_REQUEST);
    }

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const reservation = await updateCinemaFilmReservationSeats(
      reservationId,
      customerId,
      Array.isArray(seatIds) ? seatIds : [],
    );

    if (!reservation) {
      return response({ message: 'Reservation not found' }, STATUS.NOT_FOUND);
    }

    return response({ reservation }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === 'CINEMA_RESERVATION_FORBIDDEN') {
        return response({ message: error.message }, STATUS.FORBIDDEN);
      }

      if (
        error.code === 'INVALID_CINEMA_RESERVATION' ||
        error.code === 'INVALID_CINEMA_RESERVATION_SEATS'
      ) {
        return response({ message: error.message }, STATUS.BAD_REQUEST);
      }
    }

    return handleError('Cinema Reservation - Update seats', error as Error);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservationId = Number.parseInt(id, 10);
    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || '').trim();

    if (Number.isNaN(reservationId)) {
      return response({ message: 'Invalid reservation id' }, STATUS.BAD_REQUEST);
    }

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const reservation = await cancelCinemaFilmReservation(reservationId, customerId);

    if (!reservation) {
      return response({ message: 'Reservation not found' }, STATUS.NOT_FOUND);
    }

    return response({ reservation }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === 'CINEMA_RESERVATION_FORBIDDEN') {
        return response({ message: error.message }, STATUS.FORBIDDEN);
      }
    }

    return handleError('Cinema Reservation - Cancel', error as Error);
  }
}
