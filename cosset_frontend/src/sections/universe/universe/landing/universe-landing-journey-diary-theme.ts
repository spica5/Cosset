
// ----------------------------------------------------------------------
export type JourneyDiaryNavCategory = 'all' | 'journey' | 'notes' | 'memorial';

export type JourneyDiaryNavSection = {
  id: JourneyDiaryNavCategory;
  title: string;
  description: string;
  icon: string;
  decorativeLabel?: string;
};

export const JOURNEY_DIARY_TITLE = 'Journey Diary';

export const JOURNEY_DIARY_SUBTITLE = 'Collect moments, not things.';

export const JOURNEY_DIARY_SIDEBAR_TAGLINE = 'Every journey leaves a story.';

export const JOURNEY_DIARY_HOME_TAGLINE = 'Every day is a new chapter of your journey.';

export const JOURNEY_DIARY_NAV_SECTIONS: JourneyDiaryNavSection[] = [
  {
    id: 'all',
    title: 'HOME',
    description: 'Every shared journey moment.',
    icon: 'solar:home-bold',
  },
  {
    id: 'journey',
    title: 'MY JOURNEY',
    description: 'Polaroid memories from each trip.',
    icon: 'solar:gallery-bold',
    decorativeLabel: 'Keep exploring',
  },
  {
    id: 'notes',
    title: 'MY NOTES',
    description: 'Travel journal entries and reflections.',
    icon: 'solar:notebook-bold',
    decorativeLabel: 'Write it down',
  },
  {
    id: 'memorial',
    title: 'MEMORIAL THINGS',
    description: 'Scenery, food, culture, and keepsakes.',
    icon: 'solar:heart-bold',
    decorativeLabel: 'Remember this',
  },
];
