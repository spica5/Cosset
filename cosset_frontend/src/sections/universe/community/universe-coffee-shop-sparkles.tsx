'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

// ----------------------------------------------------------------------

const sparkleTwinkle = keyframes`
  0%, 100% {
    opacity: 0;
    transform: scale(0.35) rotate(0deg);
  }
  45% {
    opacity: 1;
    transform: scale(1) rotate(90deg);
  }
  70% {
    opacity: 0.65;
    transform: scale(0.85) rotate(135deg);
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    opacity: 0.15;
    transform: scale(0.85);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.08);
  }
`;

const shimmerSweep = keyframes`
  0% {
    transform: translateX(-120%) skewX(-12deg);
    opacity: 0;
  }
  35% {
    opacity: 0.45;
  }
  100% {
    transform: translateX(220%) skewX(-12deg);
    opacity: 0;
  }
`;

type SparkleSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
};

type GlowSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
};

/** Deterministic PRNG so sparkle layout is stable per coffee shop (SSR-safe). */
function createSeededRandom(seed: number) {
  let state = Math.abs(Math.trunc(seed)) % 2147483646 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildSparkles(count: number, seed: number): SparkleSpec[] {
  const rnd = createSeededRandom(seed);

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: rnd() * 100,
    top: rnd() * 100,
    size: 2 + rnd() * 5,
    delay: rnd() * 5,
    duration: 2.2 + rnd() * 2.8,
  }));
}

function buildGlows(count: number, seed: number): GlowSpec[] {
  const rnd = createSeededRandom(seed + 7919);

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: rnd() * 100,
    top: rnd() * 100,
    size: 48 + rnd() * 120,
    delay: rnd() * 4,
    duration: 4 + rnd() * 5,
  }));
}

type LayoutMode = 'fullscreen' | 'contained';

type Props = {
  seed?: string | number;
  layout?: LayoutMode;
};

export function UniverseCoffeeShopSparkles({ seed = 1, layout = 'fullscreen' }: Props) {
  const numericSeed =
    typeof seed === 'number'
      ? seed
      : Array.from(String(seed)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const sparkles = useMemo(
    () => buildSparkles(layout === 'contained' ? 28 : 56, numericSeed),
    [layout, numericSeed],
  );
  const glows = useMemo(
    () => buildGlows(layout === 'contained' ? 8 : 14, numericSeed),
    [layout, numericSeed],
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
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255, 236, 190, 0.1) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(255, 200, 120, 0.06) 0%, transparent 45%)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '45%',
            height: '100%',
            background:
              'linear-gradient(105deg, transparent 0%, rgba(255, 252, 235, 0.12) 45%, transparent 100%)',
            animation: `${shimmerSweep} 9s ease-in-out infinite`,
          },
        }}
      />

      {glows.map((glow) => (
        <Box
          key={`glow-${glow.id}`}
          sx={{
            position: 'absolute',
            left: `${glow.left}%`,
            top: `${glow.top}%`,
            width: glow.size,
            height: glow.size,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 245, 210, 0.4) 0%, rgba(255, 230, 160, 0.12) 40%, transparent 72%)',
            animation: `${glowPulse} ${glow.duration}s ease-in-out ${glow.delay}s infinite`,
          }}
        />
      ))}

      {sparkles.map((sparkle) => (
        <Box
          key={sparkle.id}
          sx={{
            position: 'absolute',
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            width: sparkle.size,
            height: sparkle.size,
            transform: 'translate(-50%, -50%)',
            animation: `${sparkleTwinkle} ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`,
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(255, 252, 238, 0.95)',
              boxShadow:
                '0 0 8px 2px rgba(255, 248, 220, 0.75), 0 0 2px rgba(255, 255, 255, 0.9)',
              borderRadius: 1,
            },
            '&::before': {
              width: sparkle.size,
              height: Math.max(1, sparkle.size * 0.22),
            },
            '&::after': {
              width: Math.max(1, sparkle.size * 0.22),
              height: sparkle.size,
            },
          }}
        />
      ))}
    </Box>
  );
}
