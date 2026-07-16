import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { listCinemaFilmReservations } from 'src/models/cinema-film-reservations';
import { normalizeCinemaCategory } from 'src/models/cinema-films';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId')?.trim() || '';
    const ownerCustomerId = searchParams.get('ownerCustomerId')?.trim() || '';
    const category = normalizeCinemaCategory(searchParams.get('category'));
    const statusParam = (searchParams.get('status') || 'reserved').trim().toLowerCase();
    const status =
      statusParam === 'all' || statusParam === 'cancelled' || statusParam === 'reserved'
        ? statusParam
        : 'reserved';

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (searchParams.get('category') && !category) {
      return response({ message: 'category must be classic, genre, or drama' }, STATUS.BAD_REQUEST);
    }

    const reservations = await listCinemaFilmReservations({
      customerId,
      ownerCustomerId: ownerCustomerId || null,
      category,
      status,
    });

    return response({ reservations }, STATUS.OK);
  } catch (error) {
    return handleError('Cinema Reservation - Get list', error as Error);
  }
}
