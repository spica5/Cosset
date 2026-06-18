import type {
  IBookshelfAudiobook,
  BookshelfAudiobookFileType,
} from 'src/types/bookshelf-audiobook';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac', 'oga']);

export const AUDIOBOOK_FILE_ACCEPT =
  'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/aac,audio/flac,.mp3,.m4a,.wav,.ogg,.aac,.flac';

export function detectAudiobookFileType(
  fileName: string,
  mimeType?: string,
): BookshelfAudiobookFileType | null {
  const mime = (mimeType || '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mime.includes('mpeg') || mime === 'audio/mp3' || ext === 'mp3') {
    return 'mp3';
  }

  if (mime === 'audio/mp4' || mime === 'audio/x-m4a' || ext === 'm4a') {
    return 'm4a';
  }

  if (mime === 'audio/wav' || mime === 'audio/x-wav' || ext === 'wav') {
    return 'wav';
  }

  if (mime === 'audio/ogg' || ext === 'ogg' || ext === 'oga') {
    return 'ogg';
  }

  if (mime === 'audio/aac' || ext === 'aac') {
    return 'aac';
  }

  if (mime === 'audio/flac' || ext === 'flac') {
    return 'flac';
  }

  if (AUDIO_EXTENSIONS.has(ext)) {
    return ext === 'oga' ? 'ogg' : (ext as BookshelfAudiobookFileType);
  }

  if (mime.startsWith('audio/')) {
    return 'mp3';
  }

  return null;
}

export function getAudiobookFileTypeLabel(fileType: BookshelfAudiobookFileType) {
  return fileType.toUpperCase();
}

export function filterAudiobooks(audiobooks: IBookshelfAudiobook[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return audiobooks;
  }

  return audiobooks.filter(
    (audiobook) =>
      audiobook.title.toLowerCase().includes(normalized) ||
      (audiobook.author || '').toLowerCase().includes(normalized) ||
      (audiobook.description || '').toLowerCase().includes(normalized) ||
      getAudiobookFileTypeLabel(audiobook.fileType).toLowerCase().includes(normalized),
  );
}

export async function resolveAudiobookAssetUrl(asset?: string | null) {
  const normalized = (asset || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return (await getS3SignedUrl(normalized)) || normalized;
}
