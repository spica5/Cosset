import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { getObjectAcl, getSignedReadUrl, getSignedUploadUrl } from 'src/utils/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getMimeType(ext: string) {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    pdf: 'application/pdf',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    oga: 'audio/ogg',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = String(searchParams.get('key') || '').trim();
    const isPublic = searchParams.get('public') === 'true';

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response(
        { message: 'Upload key must not include the public: prefix' },
        STATUS.BAD_REQUEST,
      );
    }

    const ext = key.split('.').pop()?.toLowerCase() || '';
    const requestedContentType = String(searchParams.get('contentType') || '').trim();
    const contentType = requestedContentType || getMimeType(ext);

    const uploadUrl = await getSignedUploadUrl(key, contentType, isPublic);
    const url = await getSignedReadUrl(key, isPublic);
    const acl = getObjectAcl(isPublic) || (isPublic ? 'public' : 'private');

    return response({ key, uploadUrl, contentType, url, acl }, STATUS.OK);
  } catch (error) {
    return handleError('Upload Sign - Get URL', error as Error);
  }
}
