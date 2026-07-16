import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreById } from '@/models/brand-stores';
import {
  deleteBrandCategory,
  getBrandCategoryById,
  updateBrandCategory,
} from '@/models/brand-categories';

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

async function assertCanManageCategory(req: NextRequest, categoryId: number) {
  const actor = await getActor(req);
  if (!actor || !canManageBrandStore(actor.role)) {
    return { error: response({ message: 'Business account required' }, STATUS.FORBIDDEN) };
  }

  const category = await getBrandCategoryById(categoryId);
  if (!category) {
    return { error: response({ message: 'Category not found' }, STATUS.NOT_FOUND) };
  }

  const store = await getBrandStoreById(category.storeId);
  if (!store) {
    return { error: response({ message: 'Store not found' }, STATUS.NOT_FOUND) };
  }

  if (String(store.ownerCustomerId) !== String(actor.id) && actor.role !== 'admin') {
    return {
      error: response({ message: 'You can only manage your own store' }, STATUS.FORBIDDEN),
    };
  }

  return { actor, category, store };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  try {
    const { categoryId: categoryIdRaw } = await params;
    const categoryId = Number.parseInt(categoryIdRaw, 10);

    if (!Number.isFinite(categoryId)) {
      return response({ message: 'Invalid category id' }, STATUS.BAD_REQUEST);
    }

    const access = await assertCanManageCategory(req, categoryId);
    if ('error' in access && access.error) {
      return access.error;
    }

    const body = await req.json();
    const updates = body?.updates || body?.category || {};

    const updated = await updateBrandCategory(categoryId, {
      name: updates.name,
      description: updates.description,
      coverImage: updates.coverImage,
      sortOrder: updates.sortOrder,
    });

    return response({ category: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Category - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  try {
    const { categoryId: categoryIdRaw } = await params;
    const categoryId = Number.parseInt(categoryIdRaw, 10);

    if (!Number.isFinite(categoryId)) {
      return response({ message: 'Invalid category id' }, STATUS.BAD_REQUEST);
    }

    const access = await assertCanManageCategory(req, categoryId);
    if ('error' in access && access.error) {
      return access.error;
    }

    await deleteBrandCategory(categoryId);
    return response({ success: true }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Category - Delete', error as Error);
  }
}
