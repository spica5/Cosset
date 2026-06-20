import type { NextRequest } from 'next/server';

import { listMailBackgroundImages } from 'src/models/mail-background-images';
import { getUserIdFromMailRequest } from 'src/utils/mail';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to view mail backgrounds' }, STATUS.UNAUTHORIZED);
    }

    const backgrounds = await listMailBackgroundImages();

    return response({ backgrounds }, STATUS.OK);
  } catch (error) {
    return handleError('Mail Backgrounds - List', error as Error);
  }
}
