// ----------------------------------------------------------------------

export type CoffeeShopTimeOfDay = 'day' | 'evening' | 'night';

export type CoffeeShopAtmosphereEffect =
  | 'day_none'
  | 'day_sparkles'
  | 'day_candles'
  | 'day_sparkles_candles'
  | 'evening_none'
  | 'evening_sparkles'
  | 'evening_candles'
  | 'evening_sparkles_candles'
  | 'night_none'
  | 'night_sparkles'
  | 'night_candles'
  | 'night_sparkles_candles';

export const DEFAULT_COFFEE_SHOP_ATMOSPHERE: CoffeeShopAtmosphereEffect = 'night_sparkles_candles';

export const COFFEE_SHOP_ATMOSPHERE_OPTIONS: {
  value: CoffeeShopAtmosphereEffect;
  label: string;
  description: string;
}[] = [
  {
    value: 'day_none',
    label: 'Day - None',
    description: 'Bright daytime, no effects',
  },
  {
    value: 'day_sparkles',
    label: 'Day - Sparkles',
    description: 'Bright daytime with twinkling lights',
  },
  {
    value: 'day_candles',
    label: 'Day - Candles',
    description: 'Bright daytime with candles',
  },
  {
    value: 'day_sparkles_candles',
    label: 'Day - Sparkles + candles',
    description: 'Bright daytime with sparkles and candles',
  },
  {
    value: 'evening_none',
    label: 'Evening - None',
    description: 'Evening mood, no effects',
  },
  {
    value: 'evening_sparkles',
    label: 'Evening - Sparkles',
    description: 'Evening with twinkling lights',
  },
  {
    value: 'evening_candles',
    label: 'Evening - Candles',
    description: 'Evening with burning candles',
  },
  {
    value: 'evening_sparkles_candles',
    label: 'Evening - Sparkles + candles',
    description: 'Evening with sparkles and candles',
  },
  {
    value: 'night_none',
    label: 'Night - None',
    description: 'Dark night, no effects',
  },
  {
    value: 'night_sparkles',
    label: 'Night - Sparkles',
    description: 'Dark night with twinkling lights',
  },
  {
    value: 'night_candles',
    label: 'Night - Candles',
    description: 'Dark night with burning candles',
  },
  {
    value: 'night_sparkles_candles',
    label: 'Night - Sparkles + candles',
    description: 'Dark night with sparkles and candles',
  },
];

const VALID: CoffeeShopAtmosphereEffect[] = [
  'day_none',
  'day_sparkles',
  'day_candles',
  'day_sparkles_candles',
  'evening_none',
  'evening_sparkles',
  'evening_candles',
  'evening_sparkles_candles',
  'night_none',
  'night_sparkles',
  'night_candles',
  'night_sparkles_candles',
];

export function parseCoffeeShopAtmosphere(value: unknown): CoffeeShopAtmosphereEffect {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (VALID.includes(normalized as CoffeeShopAtmosphereEffect)) {
    return normalized as CoffeeShopAtmosphereEffect;
  }

  return DEFAULT_COFFEE_SHOP_ATMOSPHERE;
}

export function getTimeOfDay(effect: CoffeeShopAtmosphereEffect): CoffeeShopTimeOfDay {
  if (effect.startsWith('day_')) return 'day';
  if (effect.startsWith('evening_')) return 'evening';
  if (effect.startsWith('night_')) return 'night';
  return 'night';
}

export function hasSparklesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {
  return effect.includes('sparkles');
}

export function hasCandlesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {
  return effect.includes('candles');
}

export function buildAtmosphereEffect(
  timeOfDay: CoffeeShopTimeOfDay,
  hasSparkles: boolean,
  hasCandles: boolean,
): CoffeeShopAtmosphereEffect {
  const effectParts: string[] = [timeOfDay];
  
  if (hasSparkles) effectParts.push('sparkles');
  if (hasCandles) effectParts.push('candles');
  
  if (effectParts.length === 1) {
    effectParts.push('none');
  }
  
  const effect = effectParts.join('_') as CoffeeShopAtmosphereEffect;
  return VALID.includes(effect) ? effect : DEFAULT_COFFEE_SHOP_ATMOSPHERE;
}

/** CSS filter for background when evening effect is active */
export const COFFEE_SHOP_EVENING_BACKGROUND_FILTER =
  'brightness(0.58) saturate(0.82) contrast(1.04)';

export const COFFEE_SHOP_EVENING_GRADIENT_BACKGROUND_FILTER =
  'brightness(0.55) saturate(0.75)';

/** CSS filter for background when night effect is active */
export const COFFEE_SHOP_NIGHT_BACKGROUND_FILTER =
  'brightness(0.35) saturate(0.6) contrast(1.2)';

export const COFFEE_SHOP_NIGHT_GRADIENT_BACKGROUND_FILTER =
  'brightness(0.3) saturate(0.5)';

export function getBackgroundFilter(
  timeOfDay: CoffeeShopTimeOfDay,
  isGradient: boolean,
): string | undefined {
  if (timeOfDay === 'day') return undefined;
  if (timeOfDay === 'evening') {
    return isGradient ? COFFEE_SHOP_EVENING_GRADIENT_BACKGROUND_FILTER : COFFEE_SHOP_EVENING_BACKGROUND_FILTER;
  }
  if (timeOfDay === 'night') {
    return isGradient ? COFFEE_SHOP_NIGHT_GRADIENT_BACKGROUND_FILTER : COFFEE_SHOP_NIGHT_BACKGROUND_FILTER;
  }
  return undefined;
}
