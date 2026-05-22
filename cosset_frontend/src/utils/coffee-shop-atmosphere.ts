// ----------------------------------------------------------------------

export type CoffeeShopAtmosphereEffect =
  | 'none'
  | 'evening'
  | 'sparkles'
  | 'evening_sparkles';

export const DEFAULT_COFFEE_SHOP_ATMOSPHERE: CoffeeShopAtmosphereEffect = 'evening_sparkles';

export const COFFEE_SHOP_ATMOSPHERE_OPTIONS: {
  value: CoffeeShopAtmosphereEffect;
  label: string;
  description: string;
}[] = [
  {
    value: 'none',
    label: 'None',
    description: 'Original brightness, no overlay',
  },
  {
    value: 'evening',
    label: 'Evening',
    description: 'Dark evening mood',
  },
  {
    value: 'sparkles',
    label: 'Sparkling lights',
    description: 'Twinkling light particles',
  },
  {
    value: 'evening_sparkles',
    label: 'Evening + sparkles',
    description: 'Dark evening with sparkling lights',
  },
];

const VALID: CoffeeShopAtmosphereEffect[] = [
  'none',
  'evening',
  'sparkles',
  'evening_sparkles',
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

export function hasEveningAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {
  return effect === 'evening' || effect === 'evening_sparkles';
}

export function hasSparklesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {
  return effect === 'sparkles' || effect === 'evening_sparkles';
}

/** CSS filter for background when evening effect is active */
export const COFFEE_SHOP_EVENING_BACKGROUND_FILTER =
  'brightness(0.58) saturate(0.82) contrast(1.04)';

export const COFFEE_SHOP_EVENING_GRADIENT_BACKGROUND_FILTER =
  'brightness(0.55) saturate(0.75)';
