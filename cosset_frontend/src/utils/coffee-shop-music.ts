import { uuidv4 } from 'src/utils/uuidv4';

// ----------------------------------------------------------------------

export type CoffeeShopMusicTrack = {
  id: string;
  title: string;
  audioUrl: string;
  /** File size in bytes (set on upload) */
  fileSize?: number | null;
  /** e.g. mp3, wav */
  extension?: string | null;
};

function titleFromAudioKey(audioUrl: string): string {
  const segment = audioUrl.split('/').pop() || audioUrl;
  const base = segment.replace(/\.[^/.]+$/, '').trim();
  return base || 'Untitled';
}

export function normalizeCoffeeShopMusicInput(music: unknown): string | null {
  if (music == null || music === '') {
    return null;
  }

  if (typeof music === 'string') {
    const trimmed = music.trim();
    return trimmed || null;
  }

  if (Array.isArray(music) || typeof music === 'object') {
    try {
      return JSON.stringify(music);
    } catch {
      return null;
    }
  }

  return null;
}

export function parseCoffeeShopMusicTracks(musicJson: unknown): CoffeeShopMusicTrack[] {
  const normalized = normalizeCoffeeShopMusicInput(musicJson);
  if (!normalized) {
    return [];
  }

  const raw = normalized.trim();
  if (!raw.startsWith('[')) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const tracks: CoffeeShopMusicTrack[] = [];

    parsed.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const row = entry as Record<string, unknown>;
      const audioUrl = String(row.audioUrl || row.url || row.audio || '').trim();
      if (!audioUrl) {
        return;
      }

      const title =
        String(row.title || row.name || '').trim() || titleFromAudioKey(audioUrl);

      const sizeRaw = row.fileSize ?? row.size;
      const fileSize =
        typeof sizeRaw === 'number' && Number.isFinite(sizeRaw)
          ? sizeRaw
          : typeof sizeRaw === 'string' && sizeRaw.trim() !== ''
            ? Number.parseInt(sizeRaw, 10)
            : null;

      const extension =
        String(row.extension || row.ext || '').trim().toLowerCase() ||
        getExtensionFromAudioKey(audioUrl);

      tracks.push({
        id: String(row.id || `music-${index}`).trim() || uuidv4(),
        title,
        audioUrl,
        fileSize: fileSize != null && !Number.isNaN(fileSize) ? fileSize : null,
        extension: extension || null,
      });
    });

    return tracks;
  } catch {
    return [];
  }
}

export function getExtensionFromAudioKey(audioUrl: string): string {
  const segment = audioUrl.split('/').pop() || audioUrl;
  const dot = segment.lastIndexOf('.');
  if (dot < 0 || dot >= segment.length - 1) {
    return '';
  }
  return segment.slice(dot + 1).toLowerCase();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMusicTrackFileInfo(track: CoffeeShopMusicTrack): string {
  const ext = (track.extension || getExtensionFromAudioKey(track.audioUrl) || 'audio').toUpperCase();
  const size = formatFileSize(track.fileSize);
  return `${ext} · ${size}`;
}

export function serializeCoffeeShopMusicTracks(tracks: CoffeeShopMusicTrack[]): string {
  const cleaned = tracks
    .map((track) => {
      const extension =
        track.extension || getExtensionFromAudioKey(track.audioUrl) || null;
      return {
        id: track.id || uuidv4(),
        title: track.title.trim(),
        audioUrl: track.audioUrl.trim(),
        ...(track.fileSize != null && track.fileSize >= 0 ? { fileSize: track.fileSize } : {}),
        ...(extension ? { extension } : {}),
      };
    })
    .filter((track) => track.title && track.audioUrl);

  if (!cleaned.length) {
    return '';
  }

  return JSON.stringify(cleaned);
}

export function getCoffeeShopMusicTracks(music: unknown): CoffeeShopMusicTrack[] {
  return parseCoffeeShopMusicTracks(music);
}

export function createDraftMusicTrack(
  audioUrl: string,
  title = '',
  meta?: { fileSize?: number; extension?: string },
): CoffeeShopMusicTrack {
  const extension =
    meta?.extension?.toLowerCase() || getExtensionFromAudioKey(audioUrl) || null;

  return {
    id: uuidv4(),
    title,
    audioUrl,
    fileSize: meta?.fileSize ?? null,
    extension,
  };
}

export function titleFromAudioFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  return base || 'Untitled';
}
