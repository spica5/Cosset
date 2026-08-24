import type { DocumentationCategory } from 'src/types/documentation';

export const DOCUMENTATION_CATEGORY_OPTIONS: Array<{
  value: DocumentationCategory;
  label: string;
}> = [
  { value: 'study', label: 'Study' },
  { value: 'work', label: 'Work' },
  { value: 'life', label: 'Life' },
  { value: 'other', label: 'Other' },
];

export function normalizeDocumentationCategory(
  value?: string | null,
): DocumentationCategory | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    normalized === 'study' ||
    normalized === 'work' ||
    normalized === 'life' ||
    normalized === 'other'
  ) {
    return normalized;
  }
  return null;
}

export function getDocumentationCategoryLabel(value?: string | null) {
  const category = normalizeDocumentationCategory(value);
  return DOCUMENTATION_CATEGORY_OPTIONS.find((item) => item.value === category)?.label || 'General';
}

export function detectDocumentationFileType(fileName?: string, mimeType?: string) {
  const fromName = String(fileName || '')
    .trim()
    .toLowerCase()
    .split('.')
    .pop();
  if (fromName && fromName.length <= 8) {
    return fromName;
  }

  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word')) return 'docx';
  if (mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'pptx';
  if (mime.startsWith('image/')) return mime.split('/')[1] || 'image';
  if (mime.startsWith('text/')) return 'txt';
  return 'file';
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'svg',
  'avif',
  'heic',
  'heif',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'm4v',
  'avi',
  'mkv',
  'ogv',
]);

function resolveExtension(fileType?: string | null, fileName?: string | null) {
  const fromType = String(fileType || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '');
  if (fromType && IMAGE_EXTENSIONS.has(fromType)) {
    return fromType;
  }
  if (fromType && VIDEO_EXTENSIONS.has(fromType)) {
    return fromType;
  }
  if (fromType.includes('/')) {
    const subtype = fromType.split('/')[1]?.split(';')[0];
    if (subtype) {
      return subtype === 'jpeg' ? 'jpg' : subtype;
    }
  }

  const name = String(fileName || '')
    .trim()
    .toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1);
  }

  return fromType;
}

export function isDocumentationImage(fileType?: string | null, fileName?: string | null) {
  return IMAGE_EXTENSIONS.has(resolveExtension(fileType, fileName));
}

export function isDocumentationVideo(fileType?: string | null, fileName?: string | null) {
  return VIDEO_EXTENSIONS.has(resolveExtension(fileType, fileName));
}

export function isDocumentationMedia(fileType?: string | null, fileName?: string | null) {
  return isDocumentationImage(fileType, fileName) || isDocumentationVideo(fileType, fileName);
}

