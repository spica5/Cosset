import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { deleteGift, updateGift, getGiftById } from 'src/models/gifts';

// ----------------------------------------------------------------------

// Disable Next.js route caching for this API (GET /api/albums/:id).
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const normalizeGiftOpenness = (value: unknown): 0 | 1 => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'public' || normalized === '1' || normalized === 'true') {
      return 1;
    }

    if (normalized === 'private' || normalized === '0' || normalized === 'false') {
      return 0;
    }
  }

  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return 0;
};

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
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const hasOpenness = Object.prototype.hasOwnProperty.call(updates, 'openness');

    const updatedGift = await updateGift(giftId, {
      title: updates.title,
      description: updates.description ?? null,
      sendTo: updates.sendTo ?? null,
      receivedFrom: updates.receivedFrom ?? null,
      eventAt: updates.eventAt ?? null,
      category: updates.category ?? null,
      images: updates.images ?? null,
      openness: hasOpenness ? normalizeGiftOpenness(updates.openness) : undefined,
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

