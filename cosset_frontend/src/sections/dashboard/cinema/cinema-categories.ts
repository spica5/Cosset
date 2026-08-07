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

const CINEMA_BANNER_BASE = `${CONFIG.dashboard.assetsDir}/assets/images/cinema/banner`;

export const CINEMA_CATEGORIES: CinemaCategoryMeta[] = [
  {
    id: 'classic',
    title: 'Classic & Social Psychology',
    shortTitle: 'Classic Cinema',
    description:
      'Timeless classics and social-psychology films that linger — character, culture, and the quiet truths between people.',
    tagline: 'Golden-age stories and the human mind',
    chips: ['Classic', 'Social psychology'],
    icon: 'solar:clapperboard-play-bold',
    accent: '#C9A227',
    accentRgb: '201, 162, 39',
    gradient: 'linear-gradient(180deg, #120C08 0%, #2A1A10 40%, #0E0906 100%)',
    overlay:
      'radial-gradient(ellipse at 50% 16%, rgba(201,162,39,0.16), transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(90,50,20,0.35), transparent 55%)',
    textColor: '#F5E6C8',
    mutedTextColor: 'rgba(245,230,200,0.7)',
    fontFamily: '"Times New Roman", Georgia, serif',
    eyebrow: 'Classic Hall',
    headline: 'Movies That Stay With You',
    subtitle: 'Classics and social psychology — emotions that linger after the lights rise.',
    quote: 'We watch not to escape life, but for life not to escape us.',
    carouselTitle: 'Playing in the classic hall',
    bannerImage: `${CINEMA_BANNER_BASE}/intro.png`,
  },
  {
    id: 'genre',
    title: 'Action & Genre Cinema',
    shortTitle: 'Genre Cinema',
    description:
      'Pulse-forward nights: action, horror, science fiction, detective mysteries, and edge-of-your-seat adventures.',
    tagline: 'Action · Horror · Science · Detective',
    chips: ['Action', 'Horror', 'Science', 'Detective'],
    icon: 'solar:atom-bold',
    accent: '#FF5A6A',
    accentRgb: '255, 90, 106',
    gradient: 'linear-gradient(180deg, #06080F 0%, #12182A 38%, #0A0610 100%)',
    overlay:
      'radial-gradient(ellipse at 20% 12%, rgba(255,90,106,0.18), transparent 46%), radial-gradient(ellipse at 85% 70%, rgba(64,196,255,0.12), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 55%)',
    textColor: '#EAF2FF',
    mutedTextColor: 'rgba(234,242,255,0.68)',
    fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
    eyebrow: 'Genre Hall',
    headline: 'Stories That Grip the Edge',
    subtitle: 'Action, horror, science, and detective films that keep the room leaning forward.',
    quote: 'Every genre is a different way of watching the same human heart.',
    carouselTitle: 'Now playing in genre hall',
    bannerImage: `${CONFIG.dashboard.assetsDir}/assets/images/cinema/banner.png`,
  },
];

export function getCinemaCategory(id: string) {
  const normalized = String(id || '')
    .trim()
    .toLowerCase();

  // Legacy drama room maps into classic & social psychology.
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
