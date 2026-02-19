import { _mock } from './_mock';

export const NEIGHBOR_DETAILS_TABS = [
  { label: 'Details', value: 'content' },
  { label: 'Friends', value: 'friends' },
];

export const NEIGHBOR_SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Popular', value: 'popular' },
  { label: 'Oldest', value: 'oldest' },
];

const CONTENT = `
<h6>Description</h6>

<p><strong>Moonlit Drawer</strong> is a small, private universe made for slow evenings and soft memories. It’s a place to tuck away moments you don’t want to lose — a cozy date, a voice note from a friend, a photo that still smells like summer. Nothing performs here. Everything rests.</p>

<p>You can shape this universe with your own motifs (colors, textures, objects), and decide when to open the shell to others. Some days it’s a fragrant pretty drawer. Some days it’s your lonely snail shell. Both are allowed.</p>

<h6>Highlights</h6>

<ul>
  <li><strong>Motif Layers:</strong> Choose a palette, texture, and 1–3 signature objects (lantern, books, petals, seashells).</li>
  <li><strong>Memory Drawer:</strong> Save “cossets” — notes, photos, links, voice snippets, tiny stories — and tag them by mood.</li>
  <li><strong>Openness Control:</strong> Private, Shared, or Invite-only — switch anytime, per drawer or per item.</li>
  <li><strong>Gentle Presence:</strong> Friends can “leave a warm mark” (a candle, star, or pebble) instead of public likes.</li>
</ul>

<h6>Inside This Universe</h6>

<p>
  <strong>Room 1 — The Pause Shelf</strong>
</p>
<p>A quiet corner for decompression. Add a 1-line “today feeling,” a breathing timer, and a small playlist. When you return, the room remembers the last light you chose.</p>

<p>
  <strong>Room 2 — The Fragrant Drawer</strong>
</p>
<p>A drawer for what you cosset: a memory of a cozy date, a photo from friends, or a short love story you’re not ready to share. Each item can be wrapped with a motif (paper, ribbon, wax seal) to match your mood.</p>

<p>
  <strong>Room 3 — The Snail Shell Door</strong>
</p>
<p>Decide how your universe connects: keep it closed, invite a few, or open it to gentle visitors. No feeds, no noise — just intentional connection when you want it.</p>

<h6>Ritual (3 Days)</h6>

<p>
  <strong>Day 1 — Make Space</strong>
</p>
<p>Choose your motif, set your atmosphere (light, sky, sound), and place your first 3 cossets. Name one thing you want to protect this week.</p>

<p>
  <strong>Day 2 — Keep What Matters</strong>
</p>
<p>Add one memory that warms you and one thought you want to release. Seal them with different wraps. If you invite someone, ask them to leave a warm mark instead of a comment.</p>

<p>
  <strong>Day 3 — Open or Stay Quiet</strong>
</p>
<p>Decide your shell setting: Private, Shared, or Invite-only. Leave a small note to your future self — a promise, a reminder, or a soft direction. Then close the drawer gently.</p>
`;


const FRIEND = [...Array(12)].map((_, index) => ({
  id: _mock.id(index),
  friends: index + 10,
  name: _mock.fullName(index),
  avatarUrl: _mock.image.avatar(index),
}));

export const NEIGHBOR_IMAGES = [...Array(16)].map((_, index) => _mock.image.travel(index));

export const _neighbors = [...Array(12)].map((_, index) => {
  const available = { startDate: _mock.time(index + 1), endDate: _mock.time(index) };

  const publish = index % 3 ? 'published' : 'draft';

  const images = NEIGHBOR_IMAGES.slice(index, index + 5);

  return {
    images,
    publish,
    available,
    id: _mock.id(index),
    name: _mock.fullName(index),
    universeName: _mock.universeName(index),
    mood: _mock.mood(index),
    motif: _mock.motif(index),
    openness: _mock.openness(index),
    friends: FRIEND,
    content: CONTENT,
    createdAt: _mock.time(index),
    totalViews: _mock.number.nativeL(index),
    ratingNumber: _mock.number.rating(index),
  };
});
