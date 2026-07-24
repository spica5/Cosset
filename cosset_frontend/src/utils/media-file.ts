/** Shared helpers for image + video uploads and previews. */

export const IMAGE_VIDEO_ACCEPT = 'image/*,video/*';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'] as const;

function normalizeMediaPath(value?: string | null) {
  return String(value || '')
    .trim()
    .split('?')[0]
    .toLowerCase();
}

function getExtension(value?: string | null) {
  const normalized = normalizeMediaPath(value);
  const match = normalized.match(/\.([a-z0-9]+)$/i);
  return match?.[1] || '';
}

export function isImageFile(file: File) {
  return Boolean(file.type && file.type.startsWith('image/'));
}

export function isVideoFile(file: File) {
  if (file.type && file.type.startsWith('video/')) {
    return true;
  }

  return VIDEO_EXTENSIONS.includes(getExtension(file.name) as (typeof VIDEO_EXTENSIONS)[number]);
}

export function isImageOrVideoFile(file: File) {
  return isImageFile(file) || isVideoFile(file);
}

export function isVideoMediaPath(value?: string | null) {
  const normalized = normalizeMediaPath(value);

  if (!normalized) {
    return false;
  }

  if (normalized.includes('/videos/')) {
    return true;
  }

  return VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(`.${ext}`));
}

export function getVideoMimeType(value?: string | null) {
  const ext = getExtension(value);

  if (ext === 'mov') {
    return 'video/quicktime';
  }

  if (ext === 'webm') {
    return 'video/webm';
  }

  if (ext === 'm4v') {
    return 'video/mp4';
  }

  return 'video/mp4';
}
