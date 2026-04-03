import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getCoffeeShopById, updateCoffeeShop, deleteCoffeeShop } from 'src/models/coffee-shops';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const coffeeShop = await getCoffeeShopById(coffeeShopId);

    if (!coffeeShop) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    return response({ coffeeShop }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop - Get', error as Error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const coffeeShop = await updateCoffeeShop(coffeeShopId, {
      name: updates.name,
      title: updates.title,
      description: updates.description,
      type: updates.type,
      background: updates.background,
      files: updates.files,
    });

    return response({ coffeeShop }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const coffeeShopId = Number.parseInt(id, 10);

    if (Number.isNaN(coffeeShopId)) {
      return response({ message: 'Invalid coffee shop id' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteCoffeeShop(coffeeShopId);

    if (!deleted) {
      return response({ message: 'Coffee shop not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Coffee shop deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Coffee Shop - Delete', error as Error);
  }
}
