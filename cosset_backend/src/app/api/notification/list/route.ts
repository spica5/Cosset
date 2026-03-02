import type { NextRequest } from 'next/server';

import { getAllNotifications } from 'src/models/notifications';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get('customerId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const notifications = await getAllNotifications(customerId, limit, offset);

    return response({ notifications }, STATUS.OK);
  } catch (error) {
    return handleError('Notification - Get list', error as Error);
  }
}
