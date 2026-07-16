import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreById } from '@/models/brand-stores';
import { getBrandCategoryById } from '@/models/brand-categories';
import {
  deleteBrandProduct,
  getBrandProductById,
  updateBrandProduct,
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

async function assertCanManageProduct(req: NextRequest, productId: number) {
  const actor = await getActor(req);
  if (!actor || !canManageBrandStore(actor.role)) {
    return { error: response({ message: 'Business account required' }, STATUS.FORBIDDEN) };
  }

  const product = await getBrandProductById(productId);
  if (!product) {
    return { error: response({ message: 'Product not found' }, STATUS.NOT_FOUND) };
  }

  const store = await getBrandStoreById(product.storeId);
  if (!store) {
    return { error: response({ message: 'Store not found' }, STATUS.NOT_FOUND) };
  }

  if (String(store.ownerCustomerId) !== String(actor.id) && actor.role !== 'admin') {
    return {
      error: response({ message: 'You can only manage your own store' }, STATUS.FORBIDDEN),
    };
  }

  return { actor, product, store };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    const { productId: productIdRaw } = await params;
    const productId = Number.parseInt(productIdRaw, 10);

    if (!Number.isFinite(productId)) {
      return response({ message: 'Invalid product id' }, STATUS.BAD_REQUEST);
    }

    const access = await assertCanManageProduct(req, productId);
    if ('error' in access && access.error) {
      return access.error;
    }

    const body = await req.json();
    const updates = body?.updates || body?.product || {};

    if (updates.categoryId !== undefined) {
      const categoryId = Number.parseInt(String(updates.categoryId), 10);
      const category = await getBrandCategoryById(categoryId);
      if (!category || Number(category.storeId) !== Number(access.product!.storeId)) {
        return response({ message: 'Category not found in this store' }, STATUS.BAD_REQUEST);
      }
    }

    const updated = await updateBrandProduct(productId, {
      categoryId: updates.categoryId,
      name: updates.name,
      description: updates.description,
      price: updates.price,
      currency: updates.currency,
      imageUrl: updates.imageUrl,
      images: Array.isArray(updates.images) ? updates.images : undefined,
      isAvailable: updates.isAvailable,
      sortOrder: updates.sortOrder,
    });

    return response({ product: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    const { productId: productIdRaw } = await params;
    const productId = Number.parseInt(productIdRaw, 10);

    if (!Number.isFinite(productId)) {
      return response({ message: 'Invalid product id' }, STATUS.BAD_REQUEST);
    }

    const access = await assertCanManageProduct(req, productId);
    if ('error' in access && access.error) {
      return access.error;
    }

    await deleteBrandProduct(productId);
    return response({ success: true }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Product - Delete', error as Error);
  }
}
