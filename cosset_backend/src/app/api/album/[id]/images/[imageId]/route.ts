import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';

import { deleteAlbumImage } from 'src/models/album-images';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

/**
 * Delete an album image
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const { imageId } = await params;
    const imgId = parseInt(imageId, 10);

    if (Number.isNaN(imgId)) {
      return response({ message: 'Invalid image ID' }, STATUS.BAD_REQUEST);
    }

    const deleted = await deleteAlbumImage(imgId);

    if (!deleted) {
      return response({ message: 'Image not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Image deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Album Images - Delete', error as Error);
  }
}

