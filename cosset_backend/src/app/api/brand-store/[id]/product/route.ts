import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreById } from '@/models/brand-stores';
import { getBrandCategoryById } from '@/models/brand-categories';
import {
  createBrandProduct,
  getBrandProductsByStore,
} from '@/models/brand-products';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const categoryIdRaw = req.nextUrl.searchParams.get('categoryId');
    const categoryId = categoryIdRaw ? Number.parseInt(categoryIdRaw, 10) : undefined;

    const products = await getBrandProductsByStore(
      storeId,
      Number.isFinite(categoryId) ? categoryId : undefined,
    );

    return response({ products }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product - List', error as Error);
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
    const product = body?.product;

    if (!product?.name || !String(product.name).trim()) {
      return response({ message: 'Product name is required' }, STATUS.BAD_REQUEST);
    }

    const categoryId = Number.parseInt(String(product.categoryId || ''), 10);
    if (!Number.isFinite(categoryId)) {
      return response({ message: 'Category is required' }, STATUS.BAD_REQUEST);
    }

    const category = await getBrandCategoryById(categoryId);
    if (!category || Number(category.storeId) !== storeId) {
      return response({ message: 'Category not found in this store' }, STATUS.BAD_REQUEST);
    }

    const created = await createBrandProduct({
      storeId,
      categoryId,
      name: product.name,
      description: product.description ?? null,
      price: product.price ?? null,
      currency: product.currency ?? 'USD',
      imageUrl: product.imageUrl ?? null,
      images: Array.isArray(product.images) ? product.images : null,
      isAvailable: product.isAvailable !== false,
      sortOrder: product.sortOrder ?? 0,
    });

    return response({ product: created }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product - Create', error as Error);
  }
}
