'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

// ----------------------------------------------------------------------

const sparkleTwinkle = keyframes`
  0%, 100% {
    opacity: 0.25;
    filter: brightness(0.88);
  }
  50% {
    opacity: 1;
    filter: brightness(1.18);
  }
`;

const sparkleRotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const bokehPulse = keyframes`
  0%, 100% {
    opacity: 0.2;
    transform: translate(-50%, -50%) scale(0.9);
  }
  50% {
    opacity: 0.55;
    transform: translate(-50%, -50%) scale(1.08);
  }
`;

const ambientGlowPulse = keyframes`
  0%, 100% {
    opacity: 0.14;
    transform: translate(-50%, -50%) scale(0.92);
  }
  50% {
    opacity: 0.38;
    transform: translate(-50%, -50%) scale(1.06);
  }
`;

type SparkleSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  rotationDuration: number;
  reverse: boolean;
};

type BokehSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

type LayoutMode = 'fullscreen' | 'contained';

function createSeededRandom(seed: number) {
  let state = Math.abs(Math.trunc(seed)) % 2147483646 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildBigSparkles(count: number, seed: number, layout: LayoutMode): SparkleSpec[] {
  const rnd = createSeededRandom(seed + 4242);
  const minSize = layout === 'contained' ? 30 : 42;
  const maxSize = layout === 'contained' ? 90 : 126;

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: 8 + rnd() * 84,
    top: 8 + rnd() * 84,
    size: minSize + rnd() * (maxSize - minSize),
    delay: rnd() * 5,
    duration: 3 + rnd() * 3.5,
    rotationDuration: 14 + rnd() * 22,
    reverse: rnd() > 0.5,
  }));
}

function buildBokeh(count: number, seed: number): BokehSpec[] {
  const rnd = createSeededRandom(seed + 9913);

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: rnd() * 100,
    top: rnd() * 100,
    size: 2 + rnd() * 5,
    delay: rnd() * 4,
    duration: 3.5 + rnd() * 4,
    opacity: 0.1 + rnd() * 0.42,
  }));
}

type Props = {
  seed?: string | number;
  layout?: LayoutMode;
};

function EightPointSparkle({ star }: { star: SparkleSpec }) {
  const uid = `big-sparkle-${star.id}`;

  const rayGradient = (x1: number, y1: number, x2: number, y2: number) => ({
    id: `${uid}-ray-${x1}-${y1}-${x2}-${y2}`,
    x1,
    y1,
    x2,
    y2,
  });

  const rays = [
    rayGradient(50, 4, 50, 96),
    rayGradient(14, 50, 86, 50),
    rayGradient(22, 22, 78, 78),
    rayGradient(78, 22, 22, 78),
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${star.left}%`,
        top: `${star.top}%`,
        width: star.size,
        height: star.size,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Box
        sx={{
          width: 1,
          height: 1,
          animation: `${sparkleTwinkle} ${star.duration}s ease-in-out ${star.delay}s infinite`,
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        }}
      >
        <Box
          sx={{
            width: 1,
            height: 1,
            transformOrigin: 'center center',
            animation: `${star.rotationDuration}s linear ${star.delay}s infinite ${
              star.reverse ? 'reverse' : 'normal'
            }`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        sx={{ display: 'block', width: 1, height: 1, overflow: 'visible' }}
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.98)" />
            <stop offset="14%" stopColor="rgba(210, 235, 255, 0.82)" />
            <stop offset="36%" stopColor="rgba(130, 185, 255, 0.32)" />
            <stop offset="62%" stopColor="rgba(90, 155, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(60, 120, 255, 0)" />
          </radialGradient>

          {rays.map((ray) => (
            <linearGradient
              key={ray.id}
              id={ray.id}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="rgba(160, 205, 255, 0)" />
              <stop offset="28%" stopColor="rgba(200, 230, 255, 0.55)" />
              <stop offset="48%" stopColor="rgba(255, 255, 255, 0.98)" />
              <stop offset="52%" stopColor="rgba(255, 255, 255, 0.98)" />
              <stop offset="72%" stopColor="rgba(190, 225, 255, 0.5)" />
              <stop offset="100%" stopColor="rgba(140, 185, 255, 0)" />
            </linearGradient>
          ))}
        </defs>

        <circle cx="50" cy="50" r="34" fill={`url(#${uid}-glow)`} />

        {/* Diagonal rays (shorter) */}
        <line
          x1="22"
          y1="22"
          x2="78"
          y2="78"
          stroke={`url(#${uid}-ray-22-22-78-78)`}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <line
          x1="78"
          y1="22"
          x2="22"
          y2="78"
          stroke={`url(#${uid}-ray-78-22-22-78)`}
          strokeWidth="1.1"
          strokeLinecap="round"
        />

        {/* Horizontal primary rays */}
        <line
          x1="14"
          y1="50"
          x2="86"
          y2="50"
          stroke={`url(#${uid}-ray-14-50-86-50)`}
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Vertical primary rays (longer) */}
        <line
          x1="50"
          y1="4"
          x2="50"
          y2="96"
          stroke={`url(#${uid}-ray-50-4-50-96)`}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <circle cx="50" cy="50" r="6" fill="rgba(220, 240, 255, 0.55)" />
        <circle cx="50" cy="50" r="2.8" fill="#ffffff" />
      </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function CoffeeShopBigSparkles({ seed = 1, layout = 'fullscreen' }: Props) {
  const numericSeed =
    typeof seed === 'number'
      ? seed
      : Array.from(String(seed)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const sparkles = useMemo(
    () => buildBigSparkles(layout === 'contained' ? 9 : 18, numericSeed, layout),
    [layout, numericSeed],
  );

  const bokeh = useMemo(
    () => buildBokeh(layout === 'contained' ? 22 : 55, numericSeed),
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
        zIndex: 3,
        pointerEvents: 'none',
        overflow: 'hidden',
        '@media (prefers-reduced-motion: reduce)': {
          '& [data-bokeh-animate="true"]': {
            animation: 'none',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 55% at 18% 12%, rgba(90, 150, 255, 0.1) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 82% 78%, rgba(70, 130, 255, 0.07) 0%, transparent 50%)',
        }}
      />

      {bokeh.map((dot) => (
        <Box
          key={`bokeh-${dot.id}`}
          data-bokeh-animate="true"
          sx={{
            position: 'absolute',
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            bgcolor: 'rgba(200, 225, 255, 0.95)',
            opacity: dot.opacity,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(0.4px)',
            boxShadow: `0 0 ${dot.size * 2}px rgba(150, 200, 255, 0.35)`,
            animation: `${bokehPulse} ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}

      {sparkles.map((star) => (
        <Box key={star.id}>
          <Box
            sx={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size * 1.6,
              height: star.size * 1.6,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(160, 205, 255, 0.22) 0%, rgba(100, 160, 255, 0.08) 45%, transparent 72%)',
              animation: `${ambientGlowPulse} ${star.duration * 1.4}s ease-in-out ${star.delay}s infinite`,
            }}
          />
          <EightPointSparkle star={star} />
        </Box>
      ))}
    </Box>
  );
}
