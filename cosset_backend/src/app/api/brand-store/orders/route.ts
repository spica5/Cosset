import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreByOwner } from '@/models/brand-stores';
import {
  getBrandProductOrdersByStore,
  updateBrandProductOrderStatus,
  type BrandProductOrderStatus,
} from '@/models/brand-product-orders';

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

const ALLOWED_STATUSES: BrandProductOrderStatus[] = ['purchased', 'fulfilled', 'cancelled'];

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

export async function GET(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const store = await getBrandStoreByOwner(actor.id);
    if (!store) {
      return response({ orders: [], store: null }, STATUS.OK);
    }

    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const orders = await getBrandProductOrdersByStore(store.id, limit, offset);
    return response({ orders, store }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Orders List', error as Error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const store = await getBrandStoreByOwner(actor.id);
    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    const body = await req.json();
    const orderId = Number(body?.orderId);
    const status = String(body?.status || '')
      .trim()
      .toLowerCase() as BrandProductOrderStatus;

    if (!Number.isFinite(orderId)) {
      return response({ message: 'orderId is required' }, STATUS.BAD_REQUEST);
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return response({ message: 'Invalid status' }, STATUS.BAD_REQUEST);
    }

    const order = await updateBrandProductOrderStatus(orderId, store.id, status);
    if (!order) {
      return response({ message: 'Order not found' }, STATUS.NOT_FOUND);
    }

    return response({ order }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Orders Update', error as Error);
  }
}
