// ----------------------------------------------------------------------

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

export type CinemaCategory = 'classic' | 'genre';

export type CinemaCategoryMeta = {
  id: CinemaCategory;
  title: string;
  shortTitle: string;
  description: string;
  tagline: string;
  /** Short line under the hall title in hub tabs. */
  tabSubtitle: string;
  chips: string[];
  icon: string;
  accent: string;
  accentRgb: string;
  gradient: string;
  overlay: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: string;
  /** Universe room intro */
  eyebrow: string;
  headline: string;
  subtitle: string;
  quote: string;
  carouselTitle: string;
  bannerImage: string;
};

const CINEMA_BANNER_BASE = `${CONFIG.universe.assetsDir}/assets/images/cinema`;

export const CINEMA_CATEGORIES: CinemaCategoryMeta[] = [
  {
    id: 'classic',
    title: 'Emotion & Adventure',
    shortTitle: 'Cinema 1',
    description:
      'Stories that move the heart and spark the imagination — action, adventure, comedy, drama, romance, and animation.',
    tagline: 'Action · Adventure · Comedy · Drama · Romance · Animation',
    tabSubtitle: 'Cinema 1',
    chips: ['Action', 'Adventure', 'Comedy', 'Drama', 'Romance', 'Animation'],
    icon: 'solar:clapperboard-play-bold',
    accent: '#C9A227',
    accentRgb: '201, 162, 39',
    gradient: 'linear-gradient(180deg, #120C08 0%, #2A1A10 40%, #0E0906 100%)',
    overlay:
      'radial-gradient(ellipse at 50% 16%, rgba(201,162,39,0.16), transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(90,50,20,0.35), transparent 55%)',
    textColor: '#F5E6C8',
    mutedTextColor: 'rgba(245,230,200,0.7)',
    fontFamily: '"Times New Roman", Georgia, serif',
    eyebrow: 'Cinema 1',
    headline: 'Emotion & Adventure',
    subtitle:
      'Action, adventure, comedy, drama, romance, and animation — films that stir feeling and take you somewhere new.',
    quote: 'We watch not to escape life, but for life not to escape us.',
    carouselTitle: 'Playing in Emotion & Adventure',
    bannerImage: `${CINEMA_BANNER_BASE}/emotion_adventure.png`,
  },
  {
    id: 'genre',
    title: 'Mystery & Fantasy',
    shortTitle: 'Cinema 2',
    description:
      'Shadows, secrets, and other worlds — horror, thriller, mystery, crime, sci-fi, and fantasy.',
    tagline: 'Horror · Thriller · Mystery · Crime · Sci-Fi · Fantasy',
    tabSubtitle: 'Cinema 2',
    chips: ['Horror', 'Thriller', 'Mystery', 'Crime', 'Sci-Fi', 'Fantasy'],
    icon: 'solar:atom-bold',
    accent: '#FF5A6A',
    accentRgb: '255, 90, 106',
    gradient: 'linear-gradient(180deg, #06080F 0%, #12182A 38%, #0A0610 100%)',
    overlay:
      'radial-gradient(ellipse at 20% 12%, rgba(255,90,106,0.18), transparent 46%), radial-gradient(ellipse at 85% 70%, rgba(64,196,255,0.12), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 55%)',
    textColor: '#EAF2FF',
    mutedTextColor: 'rgba(234,242,255,0.68)',
    fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
    eyebrow: 'Cinema 2',
    headline: 'Mystery & Fantasy',
    subtitle:
      'Horror, thriller, mystery, crime, sci-fi, and fantasy — films that keep the room leaning into the dark.',
    quote: 'Every genre is a different way of watching the same human heart.',
    carouselTitle: 'Playing in Mystery & Fantasy',
    bannerImage: `${CINEMA_BANNER_BASE}/mystery_fantasy.png`,
  },
];

export function getCinemaCategory(id: string) {
  const normalized = String(id || '')
    .trim()
    .toLowerCase();

  // Legacy drama room maps into Emotion & Adventure (classic).
  if (normalized === 'drama') {
    return CINEMA_CATEGORIES.find((category) => category.id === 'classic') ?? null;
  }

  return CINEMA_CATEGORIES.find((category) => category.id === normalized) ?? null;
}

export function isCinemaCategory(id: string): id is CinemaCategory {
  const normalized = String(id || '')
    .trim()
    .toLowerCase();

  if (normalized === 'drama') {
    return true;
  }

  return CINEMA_CATEGORIES.some((category) => category.id === normalized);
}

export function resolveCinemaCategoryId(id: string): CinemaCategory | null {
  const category = getCinemaCategory(id);
  return category?.id ?? null;
}

export function getCinemaCategoryDashboardPath(category: CinemaCategory) {
  const pathsByCategory: Record<CinemaCategory, string> = {
    classic: paths.dashboard.community.cinema.classic,
    genre: paths.dashboard.community.cinema.genre,
  };

  return pathsByCategory[category];
}

export function cinemaShellSx(category: CinemaCategoryMeta) {
  return {
    minHeight: '100%',
    color: category.textColor,
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: { xs: 2, md: 3 },
    background: category.gradient,
    border: `1px solid rgba(${category.accentRgb}, 0.22)`,
  };
}
