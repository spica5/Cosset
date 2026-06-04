'use client';

import type { CoffeeShopAtmosphereEffect } from 'src/utils/coffee-shop-atmosphere';

import {
  hasSparklesAtmosphere,
  hasCandlesAtmosphere,
} from 'src/utils/coffee-shop-atmosphere';

import { UniverseCoffeeShopSparkles } from 'src/sections/universe/community/universe-coffee-shop-sparkles';
import { CoffeeShopCandles } from 'src/sections/universe/community/coffee-shop-candles';

// ----------------------------------------------------------------------

type LayoutMode = 'fullscreen' | 'contained';

type Props = {
  atmosphere: CoffeeShopAtmosphereEffect;
  seed?: string | number;
  layout?: LayoutMode;
};

export function CoffeeShopAtmosphereLayers({
  atmosphere,
  seed = 1,
  layout = 'fullscreen',
}: Props) {
  const showSparkles = hasSparklesAtmosphere(atmosphere);
  const showCandles = hasCandlesAtmosphere(atmosphere);

  if (!showSparkles && !showCandles) {
    return null;
  }

  return (
    <>
      {showCandles ? <CoffeeShopCandles seed={seed} layout={layout} /> : null}
      {showSparkles ? (
        <UniverseCoffeeShopSparkles seed={seed} layout={layout} />
      ) : null}
    </>
  );
}
