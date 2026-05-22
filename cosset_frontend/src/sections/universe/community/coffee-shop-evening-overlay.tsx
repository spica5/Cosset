'use client';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

type LayoutMode = 'fullscreen' | 'contained';

type Props = {
  layout?: LayoutMode;
};

export function CoffeeShopEveningOverlay({ layout = 'fullscreen' }: Props) {
  const positionSx = layout === 'fullscreen' ? { position: 'fixed' as const, inset: 0 } : { position: 'absolute' as const, inset: 0 };

  return (
    <Box
      aria-hidden
      sx={{
        ...positionSx,
        zIndex: 1,
        pointerEvents: 'none',
        background: `
          linear-gradient(
            180deg,
            rgba(12, 18, 42, 0.72) 0%,
            rgba(18, 22, 48, 0.5) 35%,
            rgba(28, 20, 48, 0.62) 70%,
            rgba(8, 10, 24, 0.78) 100%
          ),
          radial-gradient(
            ellipse 130% 90% at 50% 110%,
            rgba(45, 28, 65, 0.45) 0%,
            transparent 55%
          ),
          radial-gradient(
            ellipse 90% 70% at 0% 0%,
            rgba(8, 14, 36, 0.55) 0%,
            transparent 50%
          ),
          radial-gradient(
            ellipse 80% 60% at 100% 15%,
            rgba(10, 16, 38, 0.5) 0%,
            transparent 48%
          )
        `,
        boxShadow: 'inset 0 0 120px 40px rgba(0, 0, 0, 0.35)',
      }}
    />
  );
}
