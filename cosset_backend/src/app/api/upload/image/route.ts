import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  putObject,
  deleteObject,
  getSignedReadUrl,
  getSignedUploadUrl,
} from 'src/utils/storage';

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
    text: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

type UploadFileKind = 'image' | 'video' | 'audio' | 'pdf' | 'txt' | 'document' | 'unsupported';

const IMAGE_FILE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_FILE_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);
const AUDIO_FILE_EXTENSIONS = new Set(['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'oga']);
const DOCUMENT_FILE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'md',
  'zip',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
]);

const MAX_FILE_SIZE_BYTES: Record<Exclude<UploadFileKind, 'unsupported'>, number> = {
  image: 10 * 1024 * 1024,
  // Cinema and collection videos can exceed 500MB via direct/multipart storage upload.
  video: 5 * 1024 * 1024 * 1024,
  audio: 250 * 1024 * 1024,
  pdf: 120 * 1024 * 1024,
  txt: 10 * 1024 * 1024,
  document: 50 * 1024 * 1024,
};

function getUploadFileKind(file: File): UploadFileKind {
  const mime = (file.type || '').toLowerCase();

  if (mime.startsWith('image/')) {
    return 'image';
  }

  if (mime.startsWith('video/')) {
    return 'video';
  }

  if (mime.startsWith('audio/')) {
    return 'audio';
  }

  if (mime === 'application/pdf') {
    return 'pdf';
  }

  if (mime === 'text/plain') {
    return 'txt';
  }

  if (DOCUMENT_MIME_TYPES.has(mime)) {
    return 'document';
  }

  const ext = getFileExtension(file);

  if (IMAGE_FILE_EXTENSIONS.has(ext)) {
    return 'image';
  }

  if (VIDEO_FILE_EXTENSIONS.has(ext)) {
    return 'video';
  }

  if (AUDIO_FILE_EXTENSIONS.has(ext)) {
    return 'audio';
  }

  if (ext === 'pdf') {
    return 'pdf';
  }

  if (ext === 'txt') {
    return 'txt';
  }

  if (DOCUMENT_FILE_EXTENSIONS.has(ext)) {
    return 'document';
  }

  return 'unsupported';
}

function validateSingleUploadFile(file: File): { valid: true } | { valid: false; message: string } {
  const kind = getUploadFileKind(file);

  if (kind === 'unsupported') {
    return {
      valid: false,
      message:
        'Only image, video, audio, PDF, TXT, Office documents, CSV, Markdown, or ZIP files are supported',
    };
  }

  const maxSize = MAX_FILE_SIZE_BYTES[kind];
  if (file.size > maxSize) {
    const maxSizeMb = Math.floor(maxSize / (1024 * 1024));
    return {
      valid: false,
      message: `File size must be less than ${maxSizeMb}MB for ${kind}`,
    };
  }

  return { valid: true };
}

type UploadSingleFileParams = {
  file: File;
  key: string;
  isPublic: boolean;
};

type UploadSingleFileResult = { validationMessage: string } | { key: string; url: string };

async function uploadSingleFile({
  file,
  key,
  isPublic,
}: UploadSingleFileParams): Promise<UploadSingleFileResult> {
  const validation = validateSingleUploadFile(file);
  if (!validation.valid) {
    return { validationMessage: validation.message };
  }

  const ext = getFileExtension(file);
  const contentType = file.type || getMimeType(ext);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`key:${key} contentType:${contentType}`);

  const result = await putObject({ key, body: buffer, contentType, isPublic });
  if (result.$metadata?.httpStatusCode !== 200) {
    throw new Error('Failed to upload file to storage');
  }

  const signedUrl = await getSignedReadUrl(key, isPublic);
  return { key, url: signedUrl };
}

async function uploadMultiple(
  files: Array<{ key: string; content: Buffer; contentType: string }>,
  isPublic = false,
) {
  return Promise.all(
    files.map((file) =>
      putObject({
        key: file.key,
        body: file.content,
        contentType: file.contentType,
        isPublic,
      }),
    ),
  );
}

async function getSignedReadUrls(keys: string[], isPublic = false) {
  return Promise.all(keys.map((key) => getSignedReadUrl(key, isPublic)));
}

// ----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const isPublic = searchParams.get('public') === 'true';
    const action = (searchParams.get('action') || '').trim().toLowerCase();

    if (!key || !key.trim()) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    const normalizedKey = key.trim();

    if (action === 'upload') {
      if (normalizedKey.startsWith('public:')) {
        return response(
          { message: 'Upload key must not include the public: prefix' },
          STATUS.BAD_REQUEST,
        );
      }

      const ext = normalizedKey.split('.').pop()?.toLowerCase() || '';
      const requestedContentType = (searchParams.get('contentType') || '').trim();
      const contentType = requestedContentType || getMimeType(ext);

      const uploadUrl = await getSignedUploadUrl(normalizedKey, contentType, isPublic, 60 * 30);
      const url = await getSignedReadUrl(normalizedKey, isPublic);

      return response({ key: normalizedKey, uploadUrl, contentType, url }, STATUS.OK);
    }

    let url: string;
    if (normalizedKey.startsWith('public:')) {
      // Return the key except the "public:" prefix as URL
      url = normalizedKey.substring(7);
    } else {
      url = await getSignedReadUrl(normalizedKey, isPublic);
    }

    return response({ url }, STATUS.OK);
  } catch (error) {
    return handleError('Image - Get URL', error as Error);
  }
}

/**
 * Upload one or more image files and return their URLs
 * Supports both single file (file + key) and batch uploads (files as FormData entries)
 */
export async function POST(req: NextRequest) {
  try {
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';

    const formData = await req.formData();

    // Try to get single file first
    const singleFile = formData.get('file') as File | null;
    const singleKey = formData.get('key') as string | null;

    // If single file upload
    if (singleFile && singleKey) {
      if (!singleKey.trim()) {
        return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
      }

      const uploadResult = await uploadSingleFile({
        file: singleFile,
        key: singleKey.trim(),
        isPublic,
      });

      if ('validationMessage' in uploadResult) {
        return response({ message: uploadResult.validationMessage }, STATUS.BAD_REQUEST);
      }

      return response(uploadResult, STATUS.OK);
    }

    // Handle batch uploads
    const files: Array<{ file: File; key: string }> = [];
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith('files[')) {
        const fileKey = formData.get(`keys[${key.match(/\d+/)?.[0]}]`) as string | null;
        if (fileKey) {
          files.push({ file: value, key: fileKey });
        }
      }
    });

    if (files.length > 0) {
      // Validate all files
      for (let i = 0; i < files.length; i += 1) {
        const { file } = files[i];

        const validation = validateSingleUploadFile(file);

        if (!validation.valid) {
          return response({ message: validation.message }, STATUS.BAD_REQUEST);
        }
      }

      // Prepare uploads (read files in parallel)
      const uploadData: Array<{ key: string; content: Buffer; contentType: string }> =
        await Promise.all(
          files.map(async ({ file, key }) => {
            const ext = getFileExtension(file);
            const contentType = getMimeType(ext);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return { key: key.trim(), content: buffer, contentType };
          }),
        );

      // Upload all files in parallel
      const uploadResults = await uploadMultiple(uploadData, isPublic);
      if (uploadResults.some((r) => r.$metadata?.httpStatusCode !== 200)) {
        throw new Error('Failed to upload one or more files to storage');
      }

      // Get signed URLs for all uploaded files
      const storageKeys = uploadData.map((u) => u.key);
      const signedUrls = await getSignedReadUrls(storageKeys, isPublic);

      // Return results
      const results = storageKeys.map((key, idx) => ({
        key,
        url: signedUrls[idx],
      }));

      return response({ results }, STATUS.OK);
    }

    return response(
      { message: "Either 'file' and 'key' or batch files are required" },
      STATUS.BAD_REQUEST,
    );
  } catch (error) {
    return handleError('Image Upload', error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = String(searchParams.get('key') || '').trim();

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:') || key.startsWith('http://') || key.startsWith('https://')) {
      return response(
        { message: 'Only stored upload keys can be permanently deleted.' },
        STATUS.BAD_REQUEST,
      );
    }

    await deleteObject(key);

    return response({ ok: true, key }, STATUS.OK);
  } catch (error) {
    return handleError('Image Upload - Delete', error as Error);
  }
}

/**
 * Helper function to extract file extension from File object
 */
function getFileExtension(file: File): string {
  const name = (file.name ?? '').trim();
  const lastDot = name.lastIndexOf('.');
  if (lastDot > -1 && lastDot < name.length - 1) {
    return name.slice(lastDot + 1).toLowerCase();
  }
  const subtype = (file.type.split('/')[1] ?? '').toLowerCase();
  if (subtype === 'jpeg') return 'jpg';
  if (subtype) return subtype;
  return '';
}
