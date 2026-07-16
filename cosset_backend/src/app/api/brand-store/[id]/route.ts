import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import {
  getBrandStoreById,
  updateBrandStore,
  deleteBrandStore,
} from '@/models/brand-stores';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const canManageBrandStore = (role?: string | null) => {
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  return normalized === 'business' || normalized === 'admin';
};

async function getActor(req: NextRequest) {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = `${authorization}`.split(' ')[1];
  const data = await verify(accessToken, JWT_SECRET);

  if (!data.userId) {
    return null;
  }

  return getUserById(data.userId);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storeId = Number.parseInt(id, 10);

    if (!Number.isFinite(storeId)) {
      return response({ message: 'Invalid store id' }, STATUS.BAD_REQUEST);
    }

    const store = await getBrandStoreById(storeId);

    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    return response({ store }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Details', error as Error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req);

    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const { id } = await params;
    const storeId = Number.parseInt(id, 10);

    if (!Number.isFinite(storeId)) {
      return response({ message: 'Invalid store id' }, STATUS.BAD_REQUEST);
    }

    const existing = await getBrandStoreById(storeId);

    if (!existing) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    if (String(existing.ownerCustomerId) !== String(actor.id) && actor.role !== 'admin') {
      return response({ message: 'You can only manage your own store' }, STATUS.FORBIDDEN);
    }

    const body = await req.json();
    const updates = body?.updates || body?.store || {};

    const updated = await updateBrandStore(storeId, {
      name: updates.name,
      tagline: updates.tagline,
      description: updates.description,
      coverImage: updates.coverImage,
      logoImage: updates.logoImage,
      isPublic: updates.isPublic,
    });

    return response({ store: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Update', error as Error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req);

    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const { id } = await params;
    const storeId = Number.parseInt(id, 10);

    if (!Number.isFinite(storeId)) {
      return response({ message: 'Invalid store id' }, STATUS.BAD_REQUEST);
    }

    const existing = await getBrandStoreById(storeId);

    if (!existing) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    if (String(existing.ownerCustomerId) !== String(actor.id) && actor.role !== 'admin') {
      return response({ message: 'You can only manage your own store' }, STATUS.FORBIDDEN);
    }

    await deleteBrandStore(storeId);
    return response({ success: true }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Delete', error as Error);
  }
}
