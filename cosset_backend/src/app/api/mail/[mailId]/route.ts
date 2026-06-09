import type { NextRequest } from 'next/server';

import { deleteUserMail } from 'src/models/user-mails';
import { getUserIdFromMailRequest } from 'src/utils/mail';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mailId: string }> },
) {
  try {
    const userId = await getUserIdFromMailRequest(_req);
    if (!userId) {
      return response({ message: 'Sign in to delete mail' }, STATUS.UNAUTHORIZED);
    }

    const { mailId } = await params;
    const normalizedMailId = mailId?.trim();

    if (!normalizedMailId) {
      return response({ message: 'mailId is required' }, STATUS.BAD_REQUEST);
    }

    const result = await deleteUserMail(userId, normalizedMailId);
    if (!result) {
      return response({ message: 'Mail not found!' }, STATUS.NOT_FOUND);
    }

    return response(
      {
        ok: true,
        permanent: result.permanent,
        message: result.permanent ? 'Mail permanently deleted' : 'Mail moved to trash',
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Mail - Delete', error as Error);
  }
}
