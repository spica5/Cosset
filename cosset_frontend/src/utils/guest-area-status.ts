const HOME_SPACE_ONLY_MOTIFS = new Set(['be away', 'be back soon']);

const normalizeGuestAreaMotif = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const isGuestAreaHomeSpaceOnlyMotif = (motif?: string | null) =>
  HOME_SPACE_ONLY_MOTIFS.has(normalizeGuestAreaMotif(motif));
