import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { getDocumentationUsage } from 'src/models/documentation-document';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const customerId = String(req.nextUrl.searchParams.get('customerId') || '').trim();
    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    const usage = await getDocumentationUsage(customerId);
    return response({ usage }, STATUS.OK);
  } catch (error) {
    return handleError('Documentation - Usage', error as Error);
  }
}
