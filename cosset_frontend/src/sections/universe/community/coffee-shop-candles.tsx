'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

// ----------------------------------------------------------------------

const candleFlame = keyframes`
  0%, 100% {
    opacity: 0.7;
    transform: scaleY(1) scaleX(0.85);
  }
  25% {
    opacity: 0.9;
    transform: scaleY(1.15) scaleX(0.8);
  }
  50% {
    opacity: 1;
    transform: scaleY(1.05) scaleX(0.9);
  }
  75% {
    opacity: 0.85;
    transform: scaleY(1.2) scaleX(0.75);
  }
`;

const candleGlow = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
`;

const candleLight = keyframes`
  0%, 100% {
    opacity: 0.15;
    transform: scale(0.85);
  }
  50% {
    opacity: 0.35;
    transform: scale(1.15);
  }
`;

const sparkParticle = keyframes`
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translate(var(--tx), var(--ty)) scale(0.2);
  }
`;

type CandleSpec = {
  id: number;
  left: number;
  delay: number;
  width: number;
  height: number;
  bottomOffset: number;
};

type SparkSpec = {
  id: number;
  candleId: number;
  left: number;
  tx: number;
  ty: number;
  delay: number;
  duration: number;
};

/** Deterministic PRNG so candle layout is stable per coffee shop (SSR-safe). */
function createSeededRandom(seed: number) {
  let state = Math.abs(Math.trunc(seed)) % 2147483646 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildCandles(count: number, seed: number): CandleSpec[] {
  const rnd = createSeededRandom(seed);
  const segmentWidth = 92 / count;

  return Array.from({ length: count }, (_, index) => {
    const sizeRoll = rnd();
    const isTall = sizeRoll > 0.62;
    const isShort = sizeRoll < 0.34;

    const height = isTall
      ? 44 + rnd() * 28
      : isShort
        ? 14 + rnd() * 14
        : 26 + rnd() * 16;

    const width = isTall
      ? 9 + rnd() * 5
      : isShort
        ? 5 + rnd() * 3
        : 7 + rnd() * 4;

    const baseLeft = 4 + index * segmentWidth;
    const left = baseLeft + rnd() * segmentWidth * 0.9;

    return {
      id: index,
      left,
      delay: rnd() * 0.8,
      width,
      height,
      bottomOffset: rnd() * 10,
    };
  });
}

function buildSparks(candles: CandleSpec[], seed: number): SparkSpec[] {
  const rnd = createSeededRandom(seed + 2357);
  const sparks: SparkSpec[] = [];

  for (let candleId = 0; candleId < candles.length; candleId += 1) {
    for (let i = 0; i < 3; i += 1) {
      const sparkId = candleId * 3 + i;
      sparks.push({
        id: sparkId,
        candleId,
        left: candles[candleId].left,
        tx: (rnd() - 0.5) * 40,
        ty: -20 - rnd() * 30,
        delay: rnd() * 2,
        duration: 1.2 + rnd() * 0.6,
      });
    }
  }

  return sparks;
}

type LayoutMode = 'fullscreen' | 'contained';

type Props = {
  seed?: string | number;
  layout?: LayoutMode;
  candleCount?: number;
};

const DEFAULT_CANDLE_COUNT = 16;

export function CoffeeShopCandles({
  seed = 1,
  layout = 'fullscreen',
  candleCount = DEFAULT_CANDLE_COUNT,
}: Props) {
  const numericSeed =
    typeof seed === 'number'
      ? seed
      : Array.from(String(seed)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const candles = useMemo(
    () => buildCandles(candleCount, numericSeed),
    [candleCount, numericSeed],
  );

  const sparks = useMemo(
    () => buildSparks(candles, numericSeed),
    [candles, numericSeed],
  );

  const positionSx =
    layout === 'fullscreen'
      ? { position: 'fixed' as const, inset: 0 }
      : { position: 'absolute' as const, inset: 0 };

  const baseBottom = layout === 'fullscreen' ? 6 : 2;

  return (
    <Box
      aria-hidden
      sx={{
        ...positionSx,
        zIndex: 2,
        pointerEvents: 'none',
        overflow: 'hidden',
        '@media (prefers-reduced-motion: reduce)': {
          display: 'none',
        },
      }}
    >
      {/* Candles scattered along the bottom of the view */}
      {candles.map((candle) => {
        const stickBottom = baseBottom + candle.bottomOffset;
        const flameHeight = Math.max(9, Math.min(20, candle.height * 0.32));
        const flameBottom = stickBottom + candle.height - 2;
        const glowSize = Math.max(36, Math.min(72, candle.height * 1.4));
        const ambientSize = Math.max(120, Math.min(240, candle.height * 3.2));

        return (
          <Box key={`candle-group-${candle.id}`}>
            {/* Large ambient light around candle */}
            <Box
              sx={{
                position: 'absolute',
                bottom: stickBottom + candle.height * 0.35,
                left: `${candle.left}%`,
                width: ambientSize,
                height: ambientSize,
                transform: 'translateX(-50%) translateY(30%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255, 165, 0, 0.25) 0%, rgba(255, 140, 0, 0.12) 30%, rgba(255, 100, 50, 0.05) 60%, transparent 100%)',
                animation: `${candleLight} 4s ease-in-out ${candle.delay}s infinite`,
                pointerEvents: 'none',
              }}
            />

            {/* Candle glow background */}
            <Box
              sx={{
                position: 'absolute',
                bottom: stickBottom + candle.height * 0.45,
                left: `${candle.left}%`,
                width: glowSize,
                height: glowSize,
                transform: 'translateX(-50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255, 140, 0, 0.4) 0%, rgba(255, 180, 60, 0.2) 40%, transparent 70%)',
                animation: `${candleGlow} 3s ease-in-out ${candle.delay}s infinite`,
              }}
            />

            {/* Candle flame */}
            <Box
              sx={{
                position: 'absolute',
                bottom: flameBottom,
                left: `${candle.left}%`,
                width: candle.width * 1.25,
                height: flameHeight,
                transform: 'translateX(-50%)',
                borderRadius: '50% 50% 40% 40%',
                background:
                  'linear-gradient(180deg, rgba(255, 255, 150, 0.95) 0%, rgba(255, 200, 0, 0.8) 40%, rgba(255, 100, 0, 0.6) 100%)',
                boxShadow:
                  '0 0 12px 2px rgba(255, 140, 0, 0.7), 0 0 4px rgba(255, 200, 0, 0.9), inset -1px 0 4px rgba(255, 220, 100, 0.5)',
                animation: `${candleFlame} 1.5s ease-in-out ${candle.delay}s infinite`,
                filter: 'drop-shadow(0 0 6px rgba(255, 180, 0, 0.6))',
              }}
            />

            {/* Candle stick */}
            <Box
              sx={{
                position: 'absolute',
                bottom: stickBottom,
                left: `calc(${candle.left}% + ${candle.width/2}px)`,
                width: candle.width,
                height: candle.height,
                transform: 'translateX(-50%)',
                background:
                  'linear-gradient(90deg, rgba(180, 140, 80, 0.7) 0%, rgba(200, 160, 100, 0.8) 50%, rgba(180, 140, 80, 0.7) 100%)',
                borderRadius: '25%',
              }}
            />
          </Box>
        );
      })}

      {/* Spark particles */}
      {sparks.map((spark) => {
        const candle = candles[spark.candleId];
        const sparkBottom = candle
          ? baseBottom + candle.bottomOffset + candle.height + 6
          : baseBottom + 40;

        return (
        <Box
          key={`spark-${spark.id}`}
          sx={{
            position: 'absolute',
            bottom: sparkBottom,
            left: `${spark.left}%`,
            width: 2,
            height: 2,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 150, 1) 0%, rgba(255, 200, 0, 0.8) 100%)',
            boxShadow: '0 0 3px 1px rgba(255, 180, 0, 0.9)',
            '--tx': `${spark.tx}px`,
            '--ty': `${spark.ty}px`,
            animation: `${sparkParticle} ${spark.duration}s ease-out ${spark.delay + (candle?.delay || 0)}s infinite`,
          } as any}
        />
        );
      })}
    </Box>
  );
}
