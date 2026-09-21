import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { notifyCinemaScreeningsWithin24h } from 'src/utils/cinema-schedule-notify';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) {
    // Allow in development without a secret so local testing works.
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = req.headers.get('authorization') || '';
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = req.nextUrl.searchParams.get('secret') || '';
  return querySecret === secret;
}

/**
 * Cron endpoint: send phone + in-app alerts for Cosset Cinema screenings
 * starting within the next 24 hours (opted-in users only).
 *
 * Schedule hourly, e.g. GET /api/cron/cinema-screening-reminders
 * with Authorization: Bearer $CRON_SECRET
 */
async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
  }

  const result = await notifyCinemaScreeningsWithin24h();
  return response(
    {
      ok: true,
      ...result,
    },
    STATUS.OK,
  );
}

export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (error) {
    return handleError('Cron - Cinema screening reminders', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await run(req);
  } catch (error) {
    return handleError('Cron - Cinema screening reminders', error as Error);
  }
}
