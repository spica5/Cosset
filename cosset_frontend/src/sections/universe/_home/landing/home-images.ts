import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

const HOME_IMAGES_DIR = `${CONFIG.dashboard.assetsDir}/assets/images/home`;
const DASHBOARD_IMAGES_DIR = `${CONFIG.dashboard.assetsDir}/assets/images`;

export const homeImage = (fileName: string) =>
  `${HOME_IMAGES_DIR}/${encodeURIComponent(fileName)}`;

const dashboardImage = (...parts: string[]) =>
  `${DASHBOARD_IMAGES_DIR}/${parts.map((part) => encodeURIComponent(part)).join('/')}`;

export type HomeHeroSlide = {
  id: string;
  title: string;
  overline: string;
  caption: string;
  imageUrl: string;
};

export const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: 'cosset-island-1',
    title: 'Welcome to Cosset',
    overline: 'A place for retreat',
    caption: 'Your personal sanctuary',
    imageUrl: homeImage('Cosset island (1).png'),
  },
  {
    id: 'cosset-beach',
    title: 'Memories by the shore',
    overline: 'Albums & journals',
    caption: 'Keep every moment close',
    imageUrl: homeImage('Cosset beach.png'),
  },
  {
    id: 'cosset-background-1',
    title: 'Create your space',
    overline: 'Home Space',
    caption: 'Design a world of your own',
    imageUrl: homeImage('Cosset background 1.png'),
  },
  {
    id: 'cosset-island-2',
    title: 'Connect with neighbors',
    overline: 'Community',
    caption: 'Friends just around the corner',
    imageUrl: homeImage('Cosset island (2).png'),
  },
  {
    id: 'cosset-beach-2',
    title: 'Explore together',
    overline: 'Shared journeys',
    caption: 'Stories worth keeping',
    imageUrl: homeImage('Cosset beach 2.png'),
  },
  {
    id: 'cinema',
    title: 'Cosset Cinema',
    overline: 'Cinema',
    caption: 'Films that stay with you',
    imageUrl: dashboardImage('cinema', 'banner', 'intro.png'),
  },
  {
    id: 'coffee-shop',
    title: 'Coffee Shops',
    overline: 'Coffee Shop',
    caption: 'Gather, sip, and stay awhile',
    imageUrl: dashboardImage('coffee-shop', 'background1.png'),
  },
  {
    id: 'post',
    title: 'Community Posts',
    overline: 'Posts',
    caption: 'Share updates with your neighbors',
    imageUrl: homeImage('Cosset island (3).png'),
  },
  {
    id: 'cosset-island-4',
    title: 'Find your island',
    overline: 'Retreat',
    caption: 'Quiet corners, open horizons',
    imageUrl: homeImage('Cosset island 4.png'),
  },
];

export const HOME_INTRODUCE_SLIDES = [
  {
    id: 'bungalow',
    alt: 'Cosset bungalow',
    imageUrl: homeImage('bungalow.png'),
  },
  {
    id: 'bungalow-nights-1',
    alt: 'Cosset bungalow at night',
    imageUrl: homeImage('bungalow at nights (1).png'),
  },
  {
    id: 'bungalow-nights-2',
    alt: 'Cosset bungalow at night',
    imageUrl: homeImage('bungalow at nights (2).png'),
  },
];
