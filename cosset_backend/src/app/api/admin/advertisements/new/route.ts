import type { NextRequest } from 'next/server';

import { createAdvertisement } from '@/models/advertisements';

import { requireAdminUser } from 'src/utils/admin-auth';
import { STATUS, handleError, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** POST /api/admin/advertisements/new */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json();
    const advertisement = body?.advertisement ?? body;

    if (!String(advertisement?.title || '').trim()) {
      return response({ message: 'title is required' }, STATUS.BAD_REQUEST);
    }

    if (!String(advertisement?.companyName || '').trim()) {
      return response({ message: 'companyName is required' }, STATUS.BAD_REQUEST);
    }

    const created = await createAdvertisement({
      title: advertisement.title,
      bodyText: advertisement.bodyText,
      mediaType: advertisement.mediaType,
      imageKey: advertisement.imageKey,
      videoKey: advertisement.videoKey,
      ctaLabel: advertisement.ctaLabel,
      ctaUrl: advertisement.ctaUrl,
      placement: advertisement.placement,
      status: advertisement.status,
      priority: advertisement.priority,
      companyName: advertisement.companyName,
      companyWebsite: advertisement.companyWebsite,
      companyEmail: advertisement.companyEmail,
      companyPhone: advertisement.companyPhone,
      companyLogoKey: advertisement.companyLogoKey,
      companyNotes: advertisement.companyNotes,
      startAt: advertisement.startAt,
      endAt: advertisement.endAt,
    });

    return response({ advertisement: created }, STATUS.OK);
  } catch (error) {
    console.error('[Admin advertisements - create]:', error);
    return handleError('Admin advertisements - create', error as Error);
  }
}
