import type { NextRequest } from 'next/server';

import { getSignedReadUrl } from 'src/utils/storage';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response, handleError } from 'src/utils/response';

import { getIntroVideoSetting, setIntroVideoSetting } from 'src/models/site-settings';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const isExternalVideoUrl = (value: string) => /^https?:\/\//i.test(value.trim());

async function resolvePlaybackUrl(setting: Awaited<ReturnType<typeof getIntroVideoSetting>>) {
  if (setting.videoUrl && isExternalVideoUrl(setting.videoUrl)) {
    return setting.videoUrl;
  }

  const key = (setting.videoKey || setting.videoUrl || '').trim();
  if (!key) return null;

  if (isExternalVideoUrl(key)) {
    return key;
  }

  try {
    return await getSignedReadUrl(key, false, 60 * 60);
  } catch (error) {
    console.error('[Intro Video] failed to sign playback url', error);
    return null;
  }
}

/** GET /api/site-settings/intro-video — public (landing page) */
export async function GET() {
  try {
    const setting = await getIntroVideoSetting();
    const playbackUrl = await resolvePlaybackUrl(setting);

    return response(
      {
        introVideo: {
          title: setting.title,
          videoKey: setting.videoKey,
          videoUrl: setting.videoUrl,
          playbackUrl,
          updatedAt: setting.updatedAt,
          hasVideo: Boolean(playbackUrl),
        },
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Intro Video - Get', error as Error);
  }
}

/** PUT /api/site-settings/intro-video — admin only */
export async function PUT(req: NextRequest) {
  try {
    const actor = await getAuthenticatedUser(req);
    if (!actor || actor.role !== 'admin') {
      return response({ message: 'Admin access required' }, STATUS.FORBIDDEN);
    }

    const body = await req.json();
    const clear = Boolean(body?.clear);
    const title =
      typeof body?.title === 'string' ? body.title.trim() : body?.title === null ? null : undefined;
    const videoKey =
      typeof body?.videoKey === 'string'
        ? body.videoKey.trim()
        : body?.videoKey === null
          ? null
          : undefined;
    const videoUrl =
      typeof body?.videoUrl === 'string'
        ? body.videoUrl.trim()
        : body?.videoUrl === null
          ? null
          : undefined;

    const current = await getIntroVideoSetting();

    const next = clear
      ? await setIntroVideoSetting({
          videoKey: null,
          videoUrl: null,
          title: title === undefined ? null : title,
          updatedBy: actor.id,
        })
      : await setIntroVideoSetting({
          videoKey: videoKey === undefined ? current.videoKey : videoKey,
          videoUrl: videoUrl === undefined ? current.videoUrl : videoUrl,
          title: title === undefined ? current.title : title,
          updatedBy: actor.id,
        });

    const playbackUrl = await resolvePlaybackUrl(next);

    return response(
      {
        introVideo: {
          title: next.title,
          videoKey: next.videoKey,
          videoUrl: next.videoUrl,
          playbackUrl,
          updatedAt: next.updatedAt,
          hasVideo: Boolean(playbackUrl),
        },
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Intro Video - Update', error as Error);
  }
}
