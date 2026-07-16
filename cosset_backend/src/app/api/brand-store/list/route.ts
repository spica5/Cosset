import type { NextRequest } from 'next/server';

import { getUserById } from '@/models/users';
import { getAllBrandStores } from '@/models/brand-stores';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const mine = searchParams.get('mine') === '1';

    let publicOnly = true;

    if (mine) {
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
      if (!actor) {
        return response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED);
      }

      const { getBrandStoreByOwner } = await import('@/models/brand-stores');
      const store = await getBrandStoreByOwner(actor.id);
      return response({ stores: store ? [store] : [], store: store || null }, STATUS.OK);
    }

    const authorization = req.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) {
      try {
        const accessToken = `${authorization}`.split(' ')[1];
        const data = await verify(accessToken, JWT_SECRET);
        if (data.userId) {
          const actor = await getUserById(data.userId);
          if (actor?.role === 'admin') {
            publicOnly = false;
          }
        }
      } catch {
        // Public list fallback
      }
    }

    const stores = await getAllBrandStores(limit, offset, { publicOnly });
    return response({ stores }, STATUS.OK);
  } catch (error) {
    return handleError('Brand Store - List', error as Error);
  }
}
