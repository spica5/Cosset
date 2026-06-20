import type { NextRequest } from 'next/server';

import { getUserById } from 'src/models/users';
import { createMailBackgroundImage } from 'src/models/mail-background-images';
import { getUserIdFromMailRequest } from 'src/utils/mail';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to manage mail backgrounds' }, STATUS.UNAUTHORIZED);
    }

    const actor = await getUserById(userId);
    if (!actor || actor.role !== 'admin') {
      return response({ message: 'Admin access required' }, STATUS.FORBIDDEN);
    }

    const body = await req.json();
    const imageKey = typeof body?.imageKey === 'string' ? body.imageKey.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : null;

    if (!imageKey) {
      return response({ message: 'Image key is required' }, STATUS.BAD_REQUEST);
    }

    const background = await createMailBackgroundImage({
      imageKey,
      title,
      order: typeof body?.order === 'number' ? body.order : null,
    });

    return response({ background }, STATUS.OK);
  } catch (error) {
    return handleError('Mail Backgrounds - Create', error as Error);
  }
}
