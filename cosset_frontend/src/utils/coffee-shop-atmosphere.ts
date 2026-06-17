// ----------------------------------------------------------------------



export type CoffeeShopTimeOfDay = 'day' | 'evening' | 'night';



export type CoffeeShopAtmosphereOverlays = {

  sparkles: boolean;

  candles: boolean;

  bigSparkles: boolean;

  darkScreen: boolean;

};



export type CoffeeShopAtmosphereEffect = string;



export const DEFAULT_COFFEE_SHOP_ATMOSPHERE: CoffeeShopAtmosphereEffect = 'night_sparkles_candles';



const OVERLAY_TOKEN_ORDER = [

  ['big_sparkles', 'bigSparkles'],

  ['big_stars', 'bigSparkles'],

  ['dark_screen', 'darkScreen'],

  ['sparkles', 'sparkles'],

  ['candles', 'candles'],

] as const;



export type ParsedCoffeeShopAtmosphere = {

  timeOfDay: CoffeeShopTimeOfDay;

  overlays: CoffeeShopAtmosphereOverlays;

};



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



const EMPTY_OVERLAYS: CoffeeShopAtmosphereOverlays = {

  sparkles: false,

  candles: false,

  bigSparkles: false,

  darkScreen: false,

};



export function parseAtmosphereParts(raw: string): ParsedCoffeeShopAtmosphere {

  const normalized = String(raw || '')

    .trim()

    .toLowerCase()

    .replace(/-/g, '_');



  let timeOfDay: CoffeeShopTimeOfDay = 'night';

  let rest = normalized;



  if (normalized.startsWith('evening_')) {

    timeOfDay = 'evening';

    rest = normalized.slice(8);

  } else if (normalized.startsWith('night_')) {

    timeOfDay = 'night';

    rest = normalized.slice(6);

  } else if (normalized.startsWith('day_')) {

    timeOfDay = 'day';

    rest = normalized.slice(4);

  } else {

    return { timeOfDay: 'night', overlays: { ...EMPTY_OVERLAYS } };

  }



  const overlays: CoffeeShopAtmosphereOverlays = { ...EMPTY_OVERLAYS };



  if (!rest || rest === 'none') {

    return { timeOfDay, overlays };

  }



  let remainder = rest;

  OVERLAY_TOKEN_ORDER.forEach(([token, key]) => {

    const pattern = new RegExp(`(^|_)${token}($|_)`);

    if (remainder === token || pattern.test(remainder)) {

      overlays[key] = true;

      remainder = remainder.replace(new RegExp(`(^|_)${token}($|_)`, 'g'), '_').replace(/^_|_$/g, '');

    }

  });



  return { timeOfDay, overlays };

}



export function serializeAtmosphereEffect({

  timeOfDay,

  overlays,

}: ParsedCoffeeShopAtmosphere): CoffeeShopAtmosphereEffect {

  const parts: string[] = [timeOfDay];



  if (overlays.sparkles) parts.push('sparkles');

  if (overlays.candles) parts.push('candles');

  if (overlays.bigSparkles) parts.push('big_sparkles');

  if (overlays.darkScreen) parts.push('dark_screen');



  if (parts.length === 1) {

    parts.push('none');

  }



  return parts.join('_');

}



export function parseCoffeeShopAtmosphere(value: unknown): CoffeeShopAtmosphereEffect {

  const normalized = String(value || '')

    .trim()

    .toLowerCase()

    .replace(/-/g, '_');



  if (!normalized) {

    return DEFAULT_COFFEE_SHOP_ATMOSPHERE;

  }



  return serializeAtmosphereEffect(parseAtmosphereParts(normalized));

}



export function getAtmosphereOverlays(effect: CoffeeShopAtmosphereEffect): CoffeeShopAtmosphereOverlays {

  return parseAtmosphereParts(effect).overlays;

}



export function getTimeOfDay(effect: CoffeeShopAtmosphereEffect): CoffeeShopTimeOfDay {

  return parseAtmosphereParts(effect).timeOfDay;

}



export function hasSparklesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {

  return getAtmosphereOverlays(effect).sparkles;

}



export function hasCandlesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {

  return getAtmosphereOverlays(effect).candles;

}



export function hasBigSparklesAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {

  return getAtmosphereOverlays(effect).bigSparkles;

}



export function hasBigStarsAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {

  return hasBigSparklesAtmosphere(effect);

}



export function hasDarkScreenAtmosphere(effect: CoffeeShopAtmosphereEffect): boolean {

  return getAtmosphereOverlays(effect).darkScreen;

}



export function buildAtmosphereEffect(

  timeOfDay: CoffeeShopTimeOfDay,

  hasSparkles: boolean,

  hasCandles: boolean,

  hasBigSparkles = false,

  hasDarkScreen = false,

): CoffeeShopAtmosphereEffect {

  return serializeAtmosphereEffect({

    timeOfDay,

    overlays: {

      sparkles: hasSparkles,

      candles: hasCandles,

      bigSparkles: hasBigSparkles,

      darkScreen: hasDarkScreen,

    },

  });

}



export function buildAtmosphereFromOverlays(

  timeOfDay: CoffeeShopTimeOfDay,

  overlays: CoffeeShopAtmosphereOverlays,

): CoffeeShopAtmosphereEffect {

  return serializeAtmosphereEffect({ timeOfDay, overlays });

}



export function getAtmosphereDescription(effect: CoffeeShopAtmosphereEffect): string {

  const preset = COFFEE_SHOP_ATMOSPHERE_OPTIONS.find((option) => option.value === effect);

  if (preset) {

    return preset.description;

  }



  const { timeOfDay, overlays } = parseAtmosphereParts(effect);

  const timeLabel =

    timeOfDay === 'day' ? 'Bright daytime' : timeOfDay === 'evening' ? 'Evening mood' : 'Dark night';



  const effectLabels: string[] = [];

  if (overlays.sparkles) effectLabels.push('twinkling lights');

  if (overlays.candles) effectLabels.push('candles');

  if (overlays.bigSparkles) effectLabels.push('big sparkles');

  if (overlays.darkScreen) effectLabels.push('dark screen overlay');



  if (!effectLabels.length) {

    return `${timeLabel}, no effects`;

  }



  return `${timeLabel} with ${effectLabels.join(', ')}`;

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



export const COFFEE_SHOP_DARK_SCREEN_BACKGROUND_FILTER =

  'brightness(0.48) contrast(1.12) saturate(0.82)';



export const COFFEE_SHOP_DARK_SCREEN_GRADIENT_BACKGROUND_FILTER =

  'brightness(0.58) contrast(1.08) saturate(0.88)';



export function getAtmosphereBackgroundFilter(

  effect: CoffeeShopAtmosphereEffect,

  isGradient: boolean,

): string | undefined {

  const filters: string[] = [];

  const timeFilter = getBackgroundFilter(getTimeOfDay(effect), isGradient);

  if (timeFilter) {

    filters.push(timeFilter);

  }

  if (hasDarkScreenAtmosphere(effect)) {

    filters.push(

      isGradient

        ? COFFEE_SHOP_DARK_SCREEN_GRADIENT_BACKGROUND_FILTER

        : COFFEE_SHOP_DARK_SCREEN_BACKGROUND_FILTER,

    );

  }

  return filters.length ? filters.join(' ') : undefined;

}



export type CoffeeShopAtmosphereConfig = {

  default: CoffeeShopAtmosphereEffect;

  images: Record<string, CoffeeShopAtmosphereEffect>;

};



export function parseCoffeeShopAtmosphereConfig(value: unknown): CoffeeShopAtmosphereConfig {

  const raw = String(value ?? '').trim();



  if (!raw) {

    return { default: DEFAULT_COFFEE_SHOP_ATMOSPHERE, images: {} };

  }



  if (raw.startsWith('{')) {

    try {

      const parsed = JSON.parse(raw) as {

        default?: unknown;

        images?: Record<string, unknown>;

      };



      const images: Record<string, CoffeeShopAtmosphereEffect> = {};



      if (parsed.images && typeof parsed.images === 'object') {

        Object.entries(parsed.images).forEach(([key, effectValue]) => {

          const normalizedKey = key.trim();

          if (normalizedKey) {

            images[normalizedKey] = parseCoffeeShopAtmosphere(effectValue);

          }

        });

      }



      return {

        default: parseCoffeeShopAtmosphere(parsed.default),

        images,

      };

    } catch {

      return { default: parseCoffeeShopAtmosphere(raw), images: {} };

    }

  }



  return { default: parseCoffeeShopAtmosphere(raw), images: {} };

}



export function serializeCoffeeShopAtmosphereConfig(config: CoffeeShopAtmosphereConfig): string {

  const hasCustomImageEffects = Object.values(config.images).some(

    (effect) => effect !== config.default,

  );



  if (!hasCustomImageEffects) {

    return config.default;

  }



  return JSON.stringify({

    default: config.default,

    images: config.images,

  });

}



export function getAtmosphereForBackgroundImage(

  config: CoffeeShopAtmosphereConfig,

  imageKey: string,

): CoffeeShopAtmosphereEffect {

  const normalizedKey = imageKey.trim();

  if (!normalizedKey) {

    return config.default;

  }



  return config.images[normalizedKey] ?? config.default;

}



export function getAtmosphereForBackgroundIndex(

  config: CoffeeShopAtmosphereConfig,

  backgroundKeys: string[],

  index: number,

): CoffeeShopAtmosphereEffect {

  const key = backgroundKeys[index]?.trim();

  if (!key) {

    return config.default;

  }



  return getAtmosphereForBackgroundImage(config, key);

}



export function hasCustomAtmosphereForBackgroundImage(

  config: CoffeeShopAtmosphereConfig,

  imageKey: string,

): boolean {

  const normalizedKey = imageKey.trim();

  if (!normalizedKey) {

    return false;

  }



  const effect = config.images[normalizedKey];

  return effect != null && effect !== config.default;

}


