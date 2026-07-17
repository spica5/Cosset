import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getBrandStoreById } from '@/models/brand-stores';
import { getBrandProductById } from '@/models/brand-products';
import { createBrandProductOrder } from '@/models/brand-product-orders';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function getActor(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const accessToken = `${authorization}`.split(' ')[1];
  try {
    const data = await verify(accessToken, JWT_SECRET);
    if (!data.userId) {
      return null;
    }
    const user = await getUserById(data.userId);
    if (!user) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    const { id, productId: productIdRaw } = await params;
    const storeId = Number.parseInt(id, 10);
    const productId = Number.parseInt(productIdRaw, 10);

    if (!Number.isFinite(storeId) || !Number.isFinite(productId)) {
      return response({ message: 'Invalid store or product id' }, STATUS.BAD_REQUEST);
    }

    const store = await getBrandStoreById(storeId);
    if (!store) {
      return response({ message: 'Store not found' }, STATUS.NOT_FOUND);
    }

    if (!store.isPublic) {
      return response({ message: 'This store is not available' }, STATUS.FORBIDDEN);
    }

    const product = await getBrandProductById(productId);
    if (!product || Number(product.storeId) !== storeId) {
      return response({ message: 'Product not found' }, STATUS.NOT_FOUND);
    }

    if (product.isAvailable === false) {
      return response({ message: 'This product is not available' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json().catch(() => ({}));
    const quantityRaw = Number(body?.quantity ?? 1);
    const quantity =
      Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.min(99, Math.trunc(quantityRaw)) : 1;
    const note =
      typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const actor = await getActor(req);
    let customerName =
      typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 120) : '';
    let customerEmail: string | null = null;
    let customerId: string | null = null;

    if (actor) {
      customerId = String(actor.id);
      customerEmail = actor.email || null;
      customerName =
        customerName ||
        [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() ||
        actor.email?.split('@')[0] ||
        'Customer';
    } else if (!customerName) {
      return response(
        { message: 'Please sign in or provide a display name to buy' },
        STATUS.BAD_REQUEST,
      );
    }

    const order = await createBrandProductOrder({
      storeId,
      productId,
      productName: product.name,
      productImage: product.imageUrl || product.images?.[0] || null,
      price: product.price || null,
      currency: product.currency || 'USD',
      quantity,
      customerId,
      customerName,
      customerEmail,
      note,
    });

    return response(
      {
        order,
        message: `Purchased ${quantity} × ${product.name}`,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Brand Store - Product Order', error as Error);
  }
}
