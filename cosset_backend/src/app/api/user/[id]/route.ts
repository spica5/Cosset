import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';

import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return response({ message: 'User ID is required' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserById(id);

    if (!user) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const displayName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer';

    return response(
      {
        user: {
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          displayName,
          photoURL: user.photoURL || '',
          isPublic: user.isPublic,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('User - details', error as Error);
  }
}
