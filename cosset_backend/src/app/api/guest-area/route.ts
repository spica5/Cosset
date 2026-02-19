import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { getGuestAreas, createGuestArea, updateGuestArea } from 'src/models/guest-area';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Get guest areas (list). Optional query: customerId - filter by customer.
 * Returns the most recent first; frontend can use the first item as current.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;

    const guestAreas = await getGuestAreas(customerId, 50, 0);
    return response({ guestAreas }, STATUS.OK);
  } catch (error) {
    return handleError('Guest Area - List', error as Error);
  }
}

/**
 * Create a new guest area (representative picture section)
 * Body: { title, motif, mood, pictureUrl, customerId?, designSpace? }
 * pictureUrl = S3 file key (stored in picture_url column); resolve to signed URL for display.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, motif, mood, pictureUrl, customerId, designSpace } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!pictureUrl || typeof pictureUrl !== 'string' || !pictureUrl.trim()) {
      return response({ message: 'Picture key is required' }, STATUS.BAD_REQUEST);
    }

    // If a guest area already exists for this customer, update it instead of inserting a new row
    let guestArea;

    if (customerId) {
      const existing = await getGuestAreas(String(customerId), 1, 0);
      const current = existing[0];

      if (current) {
        guestArea = await updateGuestArea(current.id, {
          title: title.trim(),
          motif: motif != null ? String(motif).trim() : null,
          mood: mood != null ? String(mood).trim() : null,
          pictureUrl: pictureUrl.trim(),
          designSpace: designSpace != null ? String(designSpace).trim() : null,
        });
      }
    }

    if (!guestArea) {
      guestArea = await createGuestArea({
        customerId: customerId ?? null,
        title: title.trim(),
        motif: motif != null ? String(motif).trim() : null,
        mood: mood != null ? String(mood).trim() : null,
        pictureUrl: pictureUrl.trim(), // S3 file key stored in picture_url
        designSpace: designSpace != null ? String(designSpace).trim() : null,
      });
    }

    return response({ guestArea }, STATUS.OK);
  } catch (error) {
    return handleError('Guest Area - Create', error as Error);
  }
}
