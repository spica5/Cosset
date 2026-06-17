'use client';

import type { CoffeeShopAtmosphereEffect } from 'src/utils/coffee-shop-atmosphere';

import {
  hasSparklesAtmosphere,
  hasCandlesAtmosphere,
  hasBigSparklesAtmosphere,
  hasDarkScreenAtmosphere,
} from 'src/utils/coffee-shop-atmosphere';

import { UniverseCoffeeShopSparkles } from 'src/sections/universe/community/universe-coffee-shop-sparkles';
import { CoffeeShopCandles } from 'src/sections/universe/community/coffee-shop-candles';
import { CoffeeShopBigSparkles } from 'src/sections/universe/community/coffee-shop-big-sparkles';
import { CoffeeShopDarkScreen } from 'src/sections/universe/community/coffee-shop-dark-screen';

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
  const showDarkScreen = hasDarkScreenAtmosphere(atmosphere);
  const showCandles = hasCandlesAtmosphere(atmosphere);
  const showSparkles = hasSparklesAtmosphere(atmosphere);
  const showBigSparkles = hasBigSparklesAtmosphere(atmosphere);

  if (!showDarkScreen && !showSparkles && !showCandles && !showBigSparkles) {
    return null;
  }

  return (
    <>
      {showDarkScreen ? <CoffeeShopDarkScreen layout={layout} /> : null}
      {showCandles ? <CoffeeShopCandles seed={seed} layout={layout} /> : null}
      {showSparkles ? <UniverseCoffeeShopSparkles seed={seed} layout={layout} /> : null}
      {showBigSparkles ? <CoffeeShopBigSparkles seed={seed} layout={layout} /> : null}
    </>
  );
}
