// ----------------------------------------------------------------------

export const MOOD_SENTENCE_TEMPLATES = [
  'Hello, new day. Today, I will live to the fullest.',
  'The sun is up, and so am I, ready to shine.',
  'A new day, a new chance to be happy.',
  'Today is going to be a memorable day.',
  'I choose to start today with a smile.',
  'Thank you, life, for another beautiful sunrise.',
  "Today, I'll be a little better than yesterday.",
  'My heart is open to all good things.',
  'A new day arrives, and hope blooms again.',
  "I'm ready for the wonderful things ahead.",
  'Wishing the world a gentle and beautiful day.',
  'A cup of coffee and a soul full of dreams.',
  'Today is a gift worth cherishing.',
  "Don't worry, everything will be okay.",
  'Live today as if it were your best day.',
  'Every sunrise carries a new beginning.',
  'Today, I want to spread positive energy.',
  'Another day to love and be loved.',
  'Today, I choose happiness.',
  "Hello, world. I'm awake and ready.",
  'A new day awaits with endless surprises.',
  'Happiness begins with simple things.',
  "Today, I'll slow down and enjoy life.",
  'Every sunrise is a little miracle.',
  'Let the sunshine guide my day.',
  "A peaceful soul is life's greatest treasure.",
  'Today, I will be braver.',
  'Another day to chase my dreams.',
  'I believe good things are coming.',
  'I begin today with gratitude.',
  'May today be filled with laughter.',
  'I carry hope into this new day.',
  'Everything can begin today.',
  'Today is a chance to continue writing my story.',
  "I won't miss the beauty around me today.",
  'Take a deep breath and enjoy life.',
  "Today, I'll stay true to myself.",
  'A new day, a renewed heart.',
  "I'm ready to embrace challenges.",
  'May good things find their way to me today.',
  'Today is a blank page waiting to be written.',
  "I'll color this day with joy.",
  "Today, I'll let my heart lead the way.",
  'Every step I take has meaning.',
  'I choose optimism no matter what.',
  'The brightest sunrise is the one within.',
  "Today, I'll love life a little more.",
  'Every good thing begins with belief.',
  'I strive to become the best version of myself.',
  "Let's make today worth living.",
  'I wake up with dreams still alive.',
  'Today is a chance to make them real.',
  'Hello sunshine, hello breeze, hello new day.',
  "Today, I'll be kind to everyone I meet.",
  "Today, I'll smile as much as I can.",
  'Life is beautiful in its own unique way.',
  'Another day to grow and learn.',
  "I'm ready to step outside my comfort zone.",
  'Trust that everything happens for a reason.',
  'Today is a priceless gift.',
  'May my heart be filled with energy.',
  'Today, I want to make a difference.',
  'The world is beautiful when seen through loving eyes.',
  "I'll do things that make me proud today.",
  'Today is a day to move forward.',
  'Be a little ray of sunshine.',
  'I choose love over complaints.',
  'A new day begins with new faith.',
  "Today, I won't give up.",
  'Every great journey begins today.',
  'Sunrise reminds us that we can always start over.',
  "Today, I'll live with passion.",
  'A new day opens countless possibilities.',
  'Today, I want to bring joy to someone.',
  'Let my heart be free today.',
  'Life becomes richer when we appreciate the present.',
  "I'll enjoy every moment.",
  'Today is a day of hope.',
  'Let my soul be as light as the clouds.',
  "I'm ready to embrace the unknown.",
  'Today, I walk forward with confidence.',
  'Wishing for a bright and beautiful day.',
  'A joyful heart is the beginning of all good things.',
  "Today, I'll spread kindness wherever I go.",
  'Live today so there will be no regrets tonight.',
  'Today is a chance to start fresh.',
  'I choose peace amidst the chaos.',
  'Today will be a beautiful chapter in my life.',
  'Let joy guide every step I take.',
  'I know something wonderful is waiting ahead.',
  "Today, I'll love life more than yesterday.",
  'Greeting this day with a heart full of sunshine.',
  'Let dreams show me the way.',
  'Today is my day to shine in my own way.',
  'I believe in the power of small things.',
  'Happiness begins in this very moment.',
  "Today, I'll live with purpose.",
  'A new day, a new journey.',
  'Wishing peace for both the world and myself.',
  'Thank you, life, for another day to love and be loved.',
] as const;

const MOOD_TEMPLATE_SET = new Set<string>(MOOD_SENTENCE_TEMPLATES);

const CUSTOM_MOODS_STORAGE_PREFIX = 'cosset:guest-area-custom-moods:';

export function isMoodTemplate(mood: string): boolean {
  return MOOD_TEMPLATE_SET.has(mood.trim());
}

export function loadCustomMoods(customerId?: string | number | null): string[] {
  if (typeof window === 'undefined' || customerId == null || customerId === '') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(`${CUSTOM_MOODS_STORAGE_PREFIX}${customerId}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCustomMood(customerId: string | number, mood: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = mood.trim();
  if (!normalized || isMoodTemplate(normalized)) {
    return;
  }

  const existing = loadCustomMoods(customerId);
  const next = [normalized, ...existing.filter((item) => item !== normalized)].slice(0, 20);

  window.localStorage.setItem(
    `${CUSTOM_MOODS_STORAGE_PREFIX}${customerId}`,
    JSON.stringify(next),
  );
}

export function getMoodOptions(customMoods: string[] = []): string[] {
  const merged = [...customMoods, ...MOOD_SENTENCE_TEMPLATES];
  const seen = new Set<string>();

  return merged.filter((mood) => {
    const key = mood.trim();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getMoodDisplayIcon(mood?: string | null): string {
  const value = (mood || '').trim().toLowerCase();

  if (!value) {
    return '😊';
  }

  if (value.includes('sun') || value.includes('shine') || value.includes('sunrise')) {
    return '🌅';
  }

  if (value.includes('coffee') || value.includes('cozy')) {
    return '☕';
  }

  if (value.includes('dream')) {
    return '💭';
  }

  if (value.includes('hope') || value.includes('joy') || value.includes('happy')) {
    return '🌈';
  }

  if (value.includes('peace') || value.includes('calm') || value.includes('gentle')) {
    return '🕊️';
  }

  if (value.includes('love') || value.includes('heart') || value.includes('kind')) {
    return '❤️';
  }

  if (value.includes('gratitude') || value.includes('thank')) {
    return '🙏';
  }

  return '🌤️';
}
