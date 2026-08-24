import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAllDocumentationDocuments } from 'src/models/documentation-document';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Number.parseInt(searchParams.get('limit') ?? '200', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const documents = await getAllDocumentationDocuments(
      searchParams.get('customerId') ?? undefined,
      Number.isNaN(limit) ? 200 : limit,
      Number.isNaN(offset) ? 0 : offset,
    );

    return response({ documents }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Get list', error as Error);
  }
}
