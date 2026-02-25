import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { deleteGift, updateGift, getGiftById } from 'src/models/gifts';

// ----------------------------------------------------------------------

// Disable Next.js route caching for this API (GET /api/albums/:id).
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Get gift by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const giftId = parseInt(id, 10);

    const gift = await getGiftById(giftId);

    if (!gift) {
      return response({ message: 'Gift not found' }, STATUS.NOT_FOUND);
    }

    return response({ gift }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Get', error as Error);
  }
}

/**
 * Update GIFT
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const giftId = parseInt(id, 10);
    const body = await req.json();
    const gift = body?.gift;

    if (!gift) {
      return response({ message: 'Gift data is required' }, STATUS.BAD_REQUEST);
    }

    const updatedGift = await updateGift(giftId, {
      title: gift.title,
      description: gift.description ?? null,
      receivedFrom: gift.receivedFrom ?? null,
      receivedDate: gift.receivedDate ?? null,
      category: gift.category ?? null,
      images: gift.images ?? null,
    });

    return response({ gift: updatedGift }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Update', error as Error);
  }
}

/**
 * Delete album
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const giftId = parseInt(id, 10);

    const deleted = await deleteGift(giftId);

    if (!deleted) {
      return response({ message: 'Gift not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Gift deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Gift - Delete', error as Error);
  }
}

