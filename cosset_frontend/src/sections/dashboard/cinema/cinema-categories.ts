// ----------------------------------------------------------------------

import { paths } from 'src/routes/paths';

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
};

export const CINEMA_CATEGORIES: CinemaCategoryMeta[] = [
  {
    id: 'classic',
    title: 'Classic Cinema',
    shortTitle: 'Classic Films',
    description: 'Screen legacy movies and beloved old good films.',
    tagline: 'Golden-age stories on timeless reels',
    icon: 'solar:clapperboard-play-bold',
    accent: '#C9A227',
    gradient: 'linear-gradient(135deg, #2C2416 0%, #4A3B1F 52%, #14100C 100%)',
  },
  {
    id: 'genre',
    title: 'Genre Cinema',
    shortTitle: 'Genre Films',
    description: 'Action, fiction, horror, and edge-of-your-seat adventures.',
    tagline: 'Pulse-pounding genre nights',
    icon: 'solar:fire-bold',
    accent: '#E53935',
    gradient: 'linear-gradient(135deg, #1A0F14 0%, #3D1219 52%, #0D080A 100%)',
  },
  {
    id: 'drama',
    title: 'Drama & Comedy',
    shortTitle: 'Drama & Comedy',
    description: 'Social drama, feature films, and comic films that move and delight.',
    tagline: 'Heartfelt features and comic relief',
    icon: 'solar:mask-happy-bold',
    accent: '#7E57C2',
    gradient: 'linear-gradient(135deg, #141828 0%, #2A2440 52%, #0E1018 100%)',
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
