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

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: rnd() * 100,
    delay: rnd() * 0.5,
    width: 8 + rnd() * 6,
  }));
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

export function CoffeeShopCandles({
  seed = 1,
  layout = 'fullscreen',
  candleCount = 5,
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
      {/* Candles at bottom of screen */}
      {candles.map((candle) => (
        <Box key={`candle-group-${candle.id}`}>
          {/* Large ambient light around candle */}
          <Box
            sx={{
              position: 'absolute',
              bottom: layout === 'fullscreen' ? '24px' : '12px',
              left: `${candle.left}%`,
              width: 200,
              height: 200,
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
              bottom: layout === 'fullscreen' ? '24px' : '12px',
              left: `${candle.left}%`,
              width: 48,
              height: 48,
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
              bottom: layout === 'fullscreen' ? '36px' : '20px',
              left: `${candle.left}%`,
              width: candle.width * 1.2,
              height: 14,
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
              bottom: layout === 'fullscreen' ? '6px' : '2px',
              left: `${candle.left}%`,
              width: candle.width,
              height: 36,
              transform: 'translateX(-50%)',
              background:
                'linear-gradient(90deg, rgba(180, 140, 80, 0.7) 0%, rgba(200, 160, 100, 0.8) 50%, rgba(180, 140, 80, 0.7) 100%)',
              borderRadius: '50%',
            }}
          />
        </Box>
      ))}

      {/* Spark particles */}
      {sparks.map((spark) => (
        <Box
          key={`spark-${spark.id}`}
          sx={{
            position: 'absolute',
            bottom: layout === 'fullscreen' ? '48px' : '32px',
            left: `${spark.left}%`,
            width: 2,
            height: 2,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 150, 1) 0%, rgba(255, 200, 0, 0.8) 100%)',
            boxShadow: '0 0 3px 1px rgba(255, 180, 0, 0.9)',
            '--tx': `${spark.tx}px`,
            '--ty': `${spark.ty}px`,
            animation: `${sparkParticle} ${spark.duration}s ease-out ${spark.delay + (candles[spark.candleId]?.delay || 0)}s infinite`,
          } as any}
        />
      ))}
    </Box>
  );
}
