'use client';

import type { CoffeeShopAtmosphereEffect } from 'src/utils/coffee-shop-atmosphere';

import {
  hasEveningAtmosphere,
  hasSparklesAtmosphere,
} from 'src/utils/coffee-shop-atmosphere';

import { CoffeeShopEveningOverlay } from 'src/sections/universe/community/coffee-shop-evening-overlay';
import { UniverseCoffeeShopSparkles } from 'src/sections/universe/community/universe-coffee-shop-sparkles';

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
  const showEvening = hasEveningAtmosphere(atmosphere);
  const showSparkles = hasSparklesAtmosphere(atmosphere);

  if (!showEvening && !showSparkles) {
    return null;
  }

  return (
    <>
      {showEvening ? <CoffeeShopEveningOverlay layout={layout} /> : null}
      {showSparkles ? (
        <UniverseCoffeeShopSparkles seed={seed} layout={layout} />
      ) : null}
    </>
  );
}
