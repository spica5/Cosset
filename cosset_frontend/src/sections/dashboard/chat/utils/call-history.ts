import type { ChatCallHistoryPayload } from 'src/types/chat-call';

// ----------------------------------------------------------------------

export function parseCallHistoryBody(body: string): ChatCallHistoryPayload | null {
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.callId || !parsed.mediaType || !parsed.status) return null;
    return {
      callId: String(parsed.callId),
      mediaType: parsed.mediaType === 'video' ? 'video' : 'audio',
      status: parsed.status,
      durationSec:
        typeof parsed.durationSec === 'number' && Number.isFinite(parsed.durationSec)
          ? parsed.durationSec
          : null,
      endedReason: parsed.endedReason ?? null,
    };
  } catch {
    return null;
  }
}

function formatDuration(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins <= 0) return `${secs}s`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatCallHistoryText(payload: ChatCallHistoryPayload): string {
  const media = payload.mediaType === 'video' ? 'Video' : 'Audio';
  const duration = formatDuration(payload.durationSec);

  switch (payload.status) {
    case 'ended':
      return duration ? `${media} call · ${duration}` : `${media} call ended`;
    case 'missed':
      return `Missed ${media.toLowerCase()} call`;
    case 'rejected':
      return `Declined ${media.toLowerCase()} call`;
    case 'cancelled':
      return `Cancelled ${media.toLowerCase()} call`;
    case 'ringing':
      return `${media} call ringing`;
    case 'active':
      return `${media} call in progress`;
    default:
      return `${media} call`;
  }
}

export function formatCallHistoryNavText(payload: ChatCallHistoryPayload): string {
  return formatCallHistoryText(payload);
}
