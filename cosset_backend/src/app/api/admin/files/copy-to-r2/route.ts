import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { requireAdminUser } from 'src/utils/admin-auth';
import { copyObjectsS3ToR2, isProviderConfigured } from 'src/utils/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Copy one or more objects from AWS S3 to Cloudflare R2 using the same keys.
 *
 * Body: { keys: string[], overwrite?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    if (!isProviderConfigured('s3')) {
      return response({ message: 'AWS S3 is not configured' }, STATUS.BAD_REQUEST);
    }
    if (!isProviderConfigured('r2')) {
      return response({ message: 'Cloudflare R2 is not configured' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json().catch(() => null);
    const keysRaw = Array.isArray(body?.keys) ? body.keys : body?.key ? [body.key] : [];
    const keys = keysRaw
      .map((value: unknown) => String(value || '').trim())
      .filter(Boolean);
    const overwrite = body?.overwrite === true || body?.overwrite === 'true';

    if (!keys.length) {
      return response({ message: 'keys is required' }, STATUS.BAD_REQUEST);
    }

    if (keys.length > 100) {
      return response({ message: 'Copy at most 100 keys per request' }, STATUS.BAD_REQUEST);
    }

    const results = await copyObjectsS3ToR2({ keys, overwrite, concurrency: 3 });
    const summary = {
      total: results.length,
      copied: results.filter((item) => item.status === 'copied').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
    };

    return response({ summary, results }, STATUS.OK);
  } catch (error) {
    return handleError('Admin Files - Copy S3 to R2', error as Error);
  }
}
