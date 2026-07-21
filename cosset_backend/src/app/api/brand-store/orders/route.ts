import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreByOwner } from '@/models/brand-stores';
import { getBrandProductById } from '@/models/brand-products';
import {
  createBrandProductOrder,
  deleteBrandProductOrder,
  getBrandProductOrdersByStore,
  updateBrandProductOrder,
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

/** Business owner: manually add a client purchase record. */
export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const store = await getBrandStoreByOwner(actor.id);
    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    const body = await req.json().catch(() => ({}));
    const productId = Number(body?.productId);
    if (!Number.isFinite(productId)) {
      return response({ message: 'productId is required' }, STATUS.BAD_REQUEST);
    }

    const product = await getBrandProductById(productId);
    if (!product || Number(product.storeId) !== Number(store.id)) {
      return response({ message: 'Product not found in your store' }, STATUS.NOT_FOUND);
    }

    const quantityRaw = Number(body?.quantity ?? 1);
    const quantity =
      Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.min(99, Math.trunc(quantityRaw)) : 1;

    const note =
      typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const customerIdRaw =
      typeof body?.customerId === 'string' || typeof body?.customerId === 'number'
        ? String(body.customerId).trim()
        : '';

    let customerId: string | null = customerIdRaw || null;
    let customerName =
      typeof body?.customerName === 'string' ? body.customerName.trim().slice(0, 120) : '';
    let customerEmail =
      typeof body?.customerEmail === 'string' ? body.customerEmail.trim().slice(0, 255) : null;

    if (customerId) {
      const customer = await getUserById(customerId);
      if (!customer) {
        return response({ message: 'Selected customer was not found' }, STATUS.NOT_FOUND);
      }
      customerId = String(customer.id);
      customerEmail = customer.email || customerEmail;
      customerName =
        customerName ||
        [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
        customer.email?.split('@')[0] ||
        'Customer';
    }

    if (!customerName) {
      return response(
        { message: 'Select a customer or enter a client name' },
        STATUS.BAD_REQUEST,
      );
    }

    const priceOverride =
      typeof body?.price === 'string' && body.price.trim() ? body.price.trim().slice(0, 40) : null;
    const currencyOverride =
      typeof body?.currency === 'string' && body.currency.trim()
        ? body.currency.trim().slice(0, 12)
        : null;

    const order = await createBrandProductOrder({
      storeId: store.id,
      productId,
      productName: product.name,
      productImage: product.imageUrl || product.images?.[0] || null,
      price: priceOverride || product.price || null,
      currency: currencyOverride || product.currency || 'USD',
      quantity,
      customerId,
      customerName,
      customerEmail,
      note,
    });

    return response({ order, message: 'Client purchase added' }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Orders Create', error as Error);
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

    if (!Number.isFinite(orderId)) {
      return response({ message: 'orderId is required' }, STATUS.BAD_REQUEST);
    }

    const hasFullEdit =
      body?.productId !== undefined ||
      body?.customerName !== undefined ||
      body?.customerId !== undefined ||
      body?.quantity !== undefined ||
      body?.price !== undefined ||
      body?.note !== undefined;

    // Status-only updates (Fulfill / Cancel buttons)
    if (!hasFullEdit) {
      const status = String(body?.status || '')
        .trim()
        .toLowerCase() as BrandProductOrderStatus;

      if (!ALLOWED_STATUSES.includes(status)) {
        return response({ message: 'Invalid status' }, STATUS.BAD_REQUEST);
      }

      const order = await updateBrandProductOrderStatus(orderId, store.id, status);
      if (!order) {
        return response({ message: 'Order not found' }, STATUS.NOT_FOUND);
      }

      return response({ order }, STATUS.OK);
    }

    const productId = Number(body?.productId);
    if (!Number.isFinite(productId)) {
      return response({ message: 'productId is required' }, STATUS.BAD_REQUEST);
    }

    const product = await getBrandProductById(productId);
    if (!product || Number(product.storeId) !== Number(store.id)) {
      return response({ message: 'Product not found in your store' }, STATUS.NOT_FOUND);
    }

    const quantityRaw = Number(body?.quantity ?? 1);
    const quantity =
      Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.min(99, Math.trunc(quantityRaw)) : 1;

    const note =
      typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const statusRaw = String(body?.status || '')
      .trim()
      .toLowerCase() as BrandProductOrderStatus;
    const status = ALLOWED_STATUSES.includes(statusRaw) ? statusRaw : undefined;

    const customerIdRaw =
      typeof body?.customerId === 'string' || typeof body?.customerId === 'number'
        ? String(body.customerId).trim()
        : '';

    let customerId: string | null = customerIdRaw || null;
    let customerName =
      typeof body?.customerName === 'string' ? body.customerName.trim().slice(0, 120) : '';
    let customerEmail =
      typeof body?.customerEmail === 'string' ? body.customerEmail.trim().slice(0, 255) : null;

    if (customerId) {
      const customer = await getUserById(customerId);
      if (!customer) {
        return response({ message: 'Selected customer was not found' }, STATUS.NOT_FOUND);
      }
      customerId = String(customer.id);
      customerEmail = customer.email || customerEmail;
      customerName =
        customerName ||
        [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
        customer.email?.split('@')[0] ||
        'Customer';
    }

    if (!customerName) {
      return response(
        { message: 'Select a customer or enter a client name' },
        STATUS.BAD_REQUEST,
      );
    }

    const priceOverride =
      typeof body?.price === 'string' && body.price.trim() ? body.price.trim().slice(0, 40) : null;
    const currencyOverride =
      typeof body?.currency === 'string' && body.currency.trim()
        ? body.currency.trim().slice(0, 12)
        : null;

    const order = await updateBrandProductOrder(orderId, store.id, {
      productId,
      productName: product.name,
      productImage: product.imageUrl || product.images?.[0] || null,
      price: priceOverride || product.price || null,
      currency: currencyOverride || product.currency || 'USD',
      quantity,
      status,
      customerId,
      customerName,
      customerEmail,
      note,
    });

    if (!order) {
      return response({ message: 'Order not found' }, STATUS.NOT_FOUND);
    }

    return response({ order, message: 'Client purchase updated' }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Orders Update', error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor || !canManageBrandStore(actor.role)) {
      return response({ message: 'Business account required' }, STATUS.FORBIDDEN);
    }

    const store = await getBrandStoreByOwner(actor.id);
    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? req.nextUrl.searchParams.get('orderId'));

    if (!Number.isFinite(orderId)) {
      return response({ message: 'orderId is required' }, STATUS.BAD_REQUEST);
    }

    const order = await deleteBrandProductOrder(orderId, store.id);
    if (!order) {
      return response({ message: 'Order not found' }, STATUS.NOT_FOUND);
    }

    return response({ order, message: 'Client purchase removed' }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - Orders Delete', error as Error);
  }
}
