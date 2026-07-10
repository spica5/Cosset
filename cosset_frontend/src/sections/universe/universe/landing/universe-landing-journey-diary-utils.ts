import type { Theme, SxProps } from '@mui/material/styles';

import type { JourneyDiaryNavCategory } from './universe-landing-journey-diary-theme';

// ----------------------------------------------------------------------

export const JOURNEY_ENTRY_IMAGE_GRADIENT =
  'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, transparent 30%, transparent 58%, rgba(0,0,0,0.5) 100%)';

export function journeyDiaryDateBadgeSx(): SxProps<Theme> {
  return {
    px: 1,
    py: 0.35,
    borderRadius: 1,
    bgcolor: 'rgba(15, 23, 42, 0.78)',
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1.2,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.24)',
  };
}

export function journeyDiaryCategoryBadgeSx(accent: string): SxProps<Theme> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1,
    py: 0.35,
    borderRadius: 99,
    bgcolor: accent,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.02em',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.24)',
    maxWidth: 'calc(100% - 20px)',
  };
}

export type JourneyDiaryEntryKind = 'picture' | 'note' | 'memorial';

export const ENTRY_CATEGORY_META: Record<
  JourneyDiaryEntryKind,
  { label: string; icon: string }
> = {
  picture: { label: 'My Journey', icon: 'solar:gallery-bold' },
  note: { label: 'My Notes', icon: 'solar:notebook-bold' },
  memorial: { label: 'Memorial Things', icon: 'solar:heart-bold' },
};

export type JourneyDiaryEntry = {
  kind: JourneyDiaryEntryKind;
  id: number;
  title: string;
  subtitle: string;
  excerpt?: string;
  imageUrl?: string;
  dateLabel?: string;
  createdAt?: string | null;
  index: number;
};

export const JOURNEY_HOME_RECENT_SIZE = 5;

export const JOURNEY_PAGE_SIZE = 6;

export function getJourneyEntryKey(entry: JourneyDiaryEntry) {
  return `${entry.kind}-${entry.id}`;
}

export function filterJourneyEntries(entries: JourneyDiaryEntry[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return entries;
  }

  return entries.filter((entry) =>
    [entry.title, entry.subtitle, entry.excerpt, entry.dateLabel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}

const CATEGORY_KIND_MAP: Record<
  Exclude<JourneyDiaryNavCategory, 'all'>,
  JourneyDiaryEntryKind
> = {
  journey: 'picture',
  notes: 'note',
  memorial: 'memorial',
};

export function filterEntriesByCategory(
  entries: JourneyDiaryEntry[],
  category: JourneyDiaryNavCategory,
) {
  if (category === 'all') {
    return entries;
  }

  const kind = CATEGORY_KIND_MAP[category];
  return entries.filter((entry) => entry.kind === kind);
}
