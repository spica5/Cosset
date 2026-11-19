import { createHash } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { recordPageVisit } from 'src/models/page-visits';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function buildAnonymousViewerKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const realIp = req.headers.get('x-real-ip') || '';
  const userAgent = req.headers.get('user-agent') || '';
  const seed = `${forwarded || realIp || 'unknown'}|${userAgent}`;
  return `anon:${createHash('sha256').update(seed).digest('hex').slice(0, 32)}`;
}

/** **************************************
 * POST /api/page-visit
 * Body: { pageKey: string, label?: string, path?: string }
 * Records a visit for a Cosset app section page.
 *************************************** */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const pageKey = String(body?.pageKey || '').trim();

    if (!pageKey) {
      return response({ message: 'pageKey is required' }, STATUS.BAD_REQUEST);
    }

    const user = await getAuthenticatedUser(req);
    const viewerKey = user?.id ? `user:${user.id}` : buildAnonymousViewerKey(req);

    const result = await recordPageVisit({
      pageKey,
      viewerKey,
      customerId: user?.id ? String(user.id) : null,
      label: body?.label ?? null,
    });

    return response(
      {
        pageKey,
        path: body?.path ?? null,
        totalVisits: result.totalVisits,
        uniqueVisitors: result.uniqueVisitors,
        isNewVisitor: result.isNewVisitor,
      },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('pageKey is invalid')) {
      return response({ message: 'pageKey is invalid' }, STATUS.BAD_REQUEST);
    }
    return handleError('Page visit - Record', error as Error);
  }
}
