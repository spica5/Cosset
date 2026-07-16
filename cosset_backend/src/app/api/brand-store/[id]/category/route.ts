import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreById } from '@/models/brand-stores';
import {
  createBrandCategory,
  getBrandCategoriesByStore,
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

    const categories = await getBrandCategoriesByStore(storeId);
    return response({ categories }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Category - List', error as Error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const store = await getBrandStoreById(storeId);
    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    if (String(store.ownerCustomerId) !== String(actor.id) && actor.role !== 'admin') {
      return response({ message: 'You can only manage your own store' }, STATUS.FORBIDDEN);
    }

    const body = await req.json();
    const category = body?.category;

    if (!category?.name || !String(category.name).trim()) {
      return response({ message: 'Category name is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createBrandCategory({
      storeId,
      name: category.name,
      description: category.description ?? null,
      coverImage: category.coverImage ?? null,
      sortOrder: category.sortOrder ?? 0,
    });

    return response({ category: created }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Category - Create', error as Error);
  }
}
