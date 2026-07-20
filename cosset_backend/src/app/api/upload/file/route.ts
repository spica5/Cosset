import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const s3 = new S3Client({
  region: requireEnv('AWS_REGION'),
  endpoint: requireEnv('AWS_S3_ENDPOINT'),
  forcePathStyle: true,
  credentials: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  },
});

function getMimeType(ext: string) {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    text: 'text/plain; charset=utf-8',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
}

/** Stream a stored file through the API (avoids browser CORS when reading PDFs). */
export async function GET(req: NextRequest) {
  try {
    const key = (req.nextUrl.searchParams.get('key') || '').trim();

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response({ message: 'Invalid key' }, STATUS.BAD_REQUEST);
    }

    const bucket = requireEnv('S3_BUCKET');
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    if (!result.Body) {
      return response({ message: 'File not found' }, STATUS.NOT_FOUND);
    }

    const bytes = await result.Body.transformToByteArray();
    const ext = key.split('.').pop()?.toLowerCase() || '';

    return new NextResponse(bytes, {
      status: STATUS.OK,
      headers: {
        'Content-Type': result.ContentType || getMimeType(ext),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return handleError('Upload - Get file', error as Error);
  }
}
