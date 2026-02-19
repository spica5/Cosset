import { fAdd } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';

import { _mock } from './_mock';
import { _tags } from '../assets';

// ----------------------------------------------------------------------

const generateProgram = () =>
  [...Array(3)].map((_, itemIndex) => ({
    label: `Day ${itemIndex + 1}`,
    text: _mock.description(itemIndex),
  }));

const generateGallery = () => [...Array(6)].map((_, index) => _mock.image.universe(index));

const generateHighlights = () => [...Array(6)].map((_, index) => _mock.sentence(index));

const generateHeroUrl = (index: number) =>
  [
    `${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-1.webp`,
    `${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-2.webp`,
    `${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-3.webp`,
    `${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-4.webp`,
    `${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-5.webp`,
  ][index];

// ----------------------------------------------------------------------

export const _universes = [...Array(12)].map((_, index) => (
  {
    id: _mock.id(index),
    tags: _tags.slice(0, 5),
    gallery: generateGallery(),
    program: generateProgram(),
    name: _mock.universeName(index),
    mood: _mock.mood(index),
    motif: _mock.motif(index),
    openness: _mock.openness(index),
    duration: '3 days 2 nights',
    createdAt: _mock.time(index),
    heroUrl: generateHeroUrl(index),
    favorited: _mock.boolean(index),
    highlights: generateHighlights(),
    connections: _mock.number.connection(index),
    coverUrl: _mock.image.universe(index),
    description: _mock.description(index),
    ratingNumber: _mock.number.rating(index),
    totalReviews: _mock.number.nativeL(index),
    available: {
      start: fAdd({ months: 2 }),
      end: fAdd({ months: 4 }),
    },
  }
));