import type { NextRequest } from 'next/server';

import { getAllAdvertisements } from '@/models/advertisements';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** GET /api/admin/advertisements/list */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const advertisements = await getAllAdvertisements(limit, offset);

    return response({ advertisements }, STATUS.OK);
  } catch (error) {
    console.error('[Admin advertisements - list]:', error);
    return handleError('Admin advertisements - list', error as Error);
  }
}
