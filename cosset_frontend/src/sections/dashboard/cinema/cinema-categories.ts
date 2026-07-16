// ----------------------------------------------------------------------

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

export type CinemaCategory = 'classic' | 'genre' | 'drama';

export type CinemaCategoryMeta = {
  id: CinemaCategory;
  title: string;
  shortTitle: string;
  description: string;
  tagline: string;
  icon: string;
  accent: string;
  gradient: string;
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
    title: 'Classic Cinema',
    shortTitle: 'Classic Films',
    description: 'Screen legacy movies and beloved old good films.',
    tagline: 'Golden-age stories on timeless reels',
    icon: 'solar:clapperboard-play-bold',
    accent: '#C9A227',
    gradient: 'linear-gradient(180deg, #0B0705 0%, #1A100C 42%, #0B0705 100%)',
    eyebrow: ' Enjoy life with movies ',
    headline: 'Movies That Stay With You',
    subtitle: 'The emotions linger – a good movie stays.',
    quote: 'We watch not to escape life, but for life not to escape us.',
    carouselTitle: 'Great movies showing on Sundays',
    bannerImage: `${CINEMA_BANNER_BASE}/intro.png`,
  },
  {
    id: 'genre',
    title: 'Genre Cinema',
    shortTitle: 'Genre Films',
    description: 'Action, fiction, horror, and edge-of-your-seat adventures.',
    tagline: 'Pulse-pounding genre nights',
    icon: 'solar:fire-bold',
    accent: '#E53935',
    gradient: 'linear-gradient(180deg, #0A0507 0%, #1C0B10 42%, #0A0507 100%)',
    eyebrow: 'Genre Nights',
    headline: 'Stories That Grip the Edge',
    subtitle: 'Pulse, thrill, and the dark between frames',
    quote: 'Every genre is a different way of watching the same human heart.',
    carouselTitle: 'Now playing in genre hall',
    bannerImage: `${CINEMA_BANNER_BASE}/intro.png`,
  },
  {
    id: 'drama',
    title: 'Drama & Comedy',
    shortTitle: 'Drama & Comedy',
    description: 'Social drama, feature films, and comic films that move and delight.',
    tagline: 'Heartfelt features and comic relief',
    icon: 'solar:mask-happy-bold',
    accent: '#D4A017',
    gradient: 'linear-gradient(180deg, #08060B 0%, #16101C 42%, #08060B 100%)',
    eyebrow: 'Drama & Comedy',
    headline: 'Laugh Softly, Feel Deeply',
    subtitle: 'Features that move — and linger after the lights rise',
    quote: 'We come for the plot. We stay for the people we become while watching.',
    carouselTitle: 'Featured dramas & comedies',
    bannerImage: `${CINEMA_BANNER_BASE}/intro.png`,
  },
];

export function getCinemaCategory(id: string) {
  return CINEMA_CATEGORIES.find((category) => category.id === id) ?? null;
}

export function isCinemaCategory(id: string): id is CinemaCategory {
  return CINEMA_CATEGORIES.some((category) => category.id === id);
}

export function getCinemaCategoryDashboardPath(category: CinemaCategory) {
  const pathsByCategory: Record<CinemaCategory, string> = {
    classic: paths.dashboard.community.cinema.classic,
    genre: paths.dashboard.community.cinema.genre,
    drama: paths.dashboard.community.cinema.drama,
  };

  return pathsByCategory[category];
}
