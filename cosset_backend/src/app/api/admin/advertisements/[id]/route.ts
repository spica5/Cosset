import type { NextRequest } from 'next/server';

import {
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
} from '@/models/advertisements';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

/** GET /api/admin/advertisements/:id */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return response({ message: 'Invalid advertisement id' }, STATUS.BAD_REQUEST);
    }

    const advertisement = await getAdvertisementById(id);
    if (!advertisement) {
      return response({ message: 'Advertisement not found' }, STATUS.NOT_FOUND);
    }

    return response({ advertisement }, STATUS.OK);
  } catch (error) {
    console.error('[Admin advertisements - get]:', error);
    return handleError('Admin advertisements - get', error as Error);
  }
}

/** PUT /api/admin/advertisements/:id */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return response({ message: 'Invalid advertisement id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates ?? body?.advertisement ?? body;

    if (!updates || typeof updates !== 'object') {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return response({ message: 'title is required' }, STATUS.BAD_REQUEST);
    }

    if (updates.companyName !== undefined && !String(updates.companyName).trim()) {
      return response({ message: 'companyName is required' }, STATUS.BAD_REQUEST);
    }

    const advertisement = await updateAdvertisement(id, updates);

    return response({ advertisement }, STATUS.OK);
  } catch (error) {
    console.error('[Admin advertisements - update]:', error);
    return handleError('Admin advertisements - update', error as Error);
  }
}

/** DELETE /api/admin/advertisements/:id */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return response({ message: 'Invalid advertisement id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteAdvertisement(id);
    if (!deleted) {
      return response({ message: 'Advertisement not found' }, STATUS.NOT_FOUND);
    }

    return response({ success: true }, STATUS.OK);
  } catch (error) {
    console.error('[Admin advertisements - delete]:', error);
    return handleError('Admin advertisements - delete', error as Error);
  }
}
