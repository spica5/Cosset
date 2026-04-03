import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { createCoffeeShop } from 'src/models/coffee-shops';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const coffeeShop = body?.coffeeShop;

    if (!coffeeShop?.name) {
      return response({ message: 'Name is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createCoffeeShop({
      name: coffeeShop.name,
      title: coffeeShop.title ?? null,
      description: coffeeShop.description ?? null,
      type: coffeeShop.type ?? null,
      background: coffeeShop.background ?? null,
      files: coffeeShop.files ?? null,
    });

    return response({ coffeeShop: created }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop - Create', error as Error);
  }
}
