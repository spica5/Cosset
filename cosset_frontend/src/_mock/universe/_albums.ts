import { CONFIG } from 'src/config-global';

import { _mock } from './_mock';
import { _moods } from '../assets';

// ----------------------------------------------------------------------

export const ALBUM_SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Popular', value: 'popular' },
  { label: 'Oldest', value: 'oldest' },
];

const TITLES = [
  'Moonlit Drawer',
  'Quiet Tide',
  'Breathing Room',
  'Sunday Corner',
  'Inner Orbit',
  'Soft Bloom',
  'Rain on Glass',
  'Late Night Thoughts',
  'First Light',
  'Inside the Shell',
  'Between Breaths',
  'After the Rain',
  'Dog-Eared Pages',
  'Small Universe',
];

const makeContent = (title: string) => `
<h4>Universe brief</h4>
<p><strong>${title}</strong> is a quiet universe made to pause, breathe, and belong. It’s not a feed — it’s a private island you can decorate with motifs that reflect your mood, your memories, and your pace.</p>

<h4>What you can do here</h4>
<ul>
  <li>Create motif layers (palette, texture, signature objects).</li>
  <li>Save “cossets”: notes, photos, links, voice snippets, small stories.</li>
  <li>Choose openness anytime: Private, Shared, Invite-only, Open.</li>
  <li>Invite friends to leave gentle marks (stars, candles, pebbles) instead of likes.</li>
</ul>

<h4>Why it matters</h4>
<p>This universe is designed for modern minds that need softness — a place where rest becomes inspiration and connection is intentional.</p>
`;

// ----------------------------------------------------------------------

const getCategory = (index: number) => {
  if ([1, 2, 10].includes(index)) return _moods[1];
  if ([3, 4, 11].includes(index)) return _moods[2];
  if ([5, 6, 12].includes(index)) return _moods[3];
  return _moods[0];
};

const getGalleryImgs = () => {
  // Return 6 unique random marketing images to vary the gallery
  const TOTAL_MARKETING_IMAGES = 12;
  const indices = new Set<number>();
  while (indices.size < 6) {
    indices.add(Math.floor(Math.random() * TOTAL_MARKETING_IMAGES));
  }
  return Array.from(indices).map((i) => _mock.image.marketing(i));
};

export const _albums = TITLES.map((title, index) => ({
  id: Number(_mock.id(index)),
  userId: _mock.id(index + 10),
  content: makeContent(title),
  title: TITLES[index],
  createdAt: _mock.time(index),
  website: 'https://cosset.com/',
  description: _mock.description(index),
  coverUrl: _mock.image.marketing(index + 1),
  heroUrl: `${CONFIG.universe.assetsDir}/assets/images/marketing/marketing-large-${(index % 6) + 1}.webp`,
  how_we_work:
    'Build your universe: choose a motif, add cossets (memories), and set your openness. Return anytime — your space stays gentle and yours.',
  results:
    'A calmer mind, clearer memories, and meaningful connection — without noise, pressure, or performance.',
  category: getCategory(index),
  images: getGalleryImgs(),
  openness: ['Public', 'Private'][index % 2],
  totalViews: _mock.number.nativeL(index),
  ratingNumber: _mock.number.rating(index),
}));
