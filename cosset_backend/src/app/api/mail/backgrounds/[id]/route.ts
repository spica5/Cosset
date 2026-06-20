import type { NextRequest } from 'next/server';

import { getUserById } from 'src/models/users';
import { deleteMailBackgroundImage } from 'src/models/mail-background-images';
import { getUserIdFromMailRequest } from 'src/utils/mail';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to manage mail backgrounds' }, STATUS.UNAUTHORIZED);
    }

    const actor = await getUserById(userId);
    if (!actor || actor.role !== 'admin') {
      return response({ message: 'Admin access required' }, STATUS.FORBIDDEN);
    }

    const { id } = await params;
    const deleted = await deleteMailBackgroundImage(id);

    if (!deleted) {
      return response({ message: 'Background image not found' }, STATUS.NOT_FOUND);
    }

    return response({ ok: true }, STATUS.OK);
  } catch (error) {
    return handleError('Mail Backgrounds - Delete', error as Error);
  }
}
