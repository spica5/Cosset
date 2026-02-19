import { _mock } from './_mock';

export const _friendCards = [...Array(21)].map((_, index) => ({
  id: _mock.id(index),
  role: _mock.role(index),
  universeName: _mock.universeName(index),
  name: _mock.fullName(index),
  mood: _mock.mood(index),
  motif: _mock.motif(index),
  coverUrl: _mock.image.cover(index),
  avatarUrl: _mock.image.avatar(index),
  connections: _mock.number.connection(index),
  ratingNumber: _mock.number.rating(index),
  openness: _mock.openness(index),
}));