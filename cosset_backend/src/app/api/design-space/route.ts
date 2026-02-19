import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import {
  getDesignSpaces,
  createDesignSpace,
  updateDesignSpace,
} from 'src/models/design-space';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Get design spaces (list). Optional query: customerId - filter by customer.
 * Returns the most recent first; frontend can use the first item as current.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;

    const designSpaces = await getDesignSpaces(customerId, 50, 0);
    return response({ designSpaces }, STATUS.OK);
  } catch (error) {
    return handleError('Design Space - List', error as Error);
  }
}

/**
 * Create a new design space record
 * Body: { background, rooms, effects, customerId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { background, rooms, effects, customerId } = body;

    // If a design space already exists for this customer, update it instead of inserting a new row
    let designSpace;

    if (customerId) {
      const existing = await getDesignSpaces(String(customerId), 1, 0);
      const current = existing[0];

      if (current) {
        designSpace = await updateDesignSpace(current.id, {
          background: background != null ? String(background).trim() : null,
          rooms: rooms != null ? String(rooms).trim() : null,
          effects: effects != null ? String(effects).trim() : null,
        });
      }
    }

    if (!designSpace) {
      designSpace = await createDesignSpace({
        customerId: customerId ?? null,
        background: background != null ? String(background).trim() : null,
        rooms: rooms != null ? String(rooms).trim() : null,
        effects: effects != null ? String(effects).trim() : null,
      });
    }

    return response({ designSpace }, STATUS.OK);
  } catch (error) {
    return handleError('Design Space - Create', error as Error);
  }
}
