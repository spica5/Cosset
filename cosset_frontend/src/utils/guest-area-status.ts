const HOME_SPACE_ONLY_MOTIFS = new Set(['be away', 'be back soon']);

const GUEST_AREA_MOTIF_ICONS: Record<string, string> = {
  'Welcome guests': '👋',
  'Be away': '🚪',
  'Be back soon.': '⏳',
};

const normalizeGuestAreaMotif = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getGuestAreaMotifIcon = (motif?: string | null) =>
  GUEST_AREA_MOTIF_ICONS[String(motif || '').trim()] || '✨';

export const isGuestAreaHomeSpaceOnlyMotif = (motif?: string | null) =>
  HOME_SPACE_ONLY_MOTIFS.has(normalizeGuestAreaMotif(motif));
