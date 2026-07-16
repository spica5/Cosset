import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { createBrandStore } from '@/models/brand-stores';

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

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return response({ message: 'Authorization token missing or invalid' }, STATUS.UNAUTHORIZED);
    }

    const accessToken = `${authorization}`.split(' ')[1];
    const data = await verify(accessToken, JWT_SECRET);

    if (!data.userId) {
      return response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED);
    }

    const actor = await getUserById(data.userId);

    if (!actor || !canManageBrandStore(actor.role)) {
      return response(
        { message: 'Business account required to open a store' },
        STATUS.FORBIDDEN,
      );
    }

    const body = await req.json();
    const store = body?.store;

    if (!store?.name || !String(store.name).trim()) {
      return response({ message: 'Store name is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createBrandStore({
      ownerCustomerId: actor.id,
      name: store.name,
      tagline: store.tagline ?? null,
      description: store.description ?? null,
      coverImage: store.coverImage ?? null,
      logoImage: store.logoImage ?? null,
      isPublic: store.isPublic !== false,
    });

    return response({ store: created }, STATUS.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'This business account already has a store') {
      return response({ message: error.message }, STATUS.BAD_REQUEST);
    }
    return handleError('Brand Store - Create', error as Error);
  }
}
