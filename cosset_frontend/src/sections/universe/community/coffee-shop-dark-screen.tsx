'use client';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

type LayoutMode = 'fullscreen' | 'contained';

type Props = {
  layout?: LayoutMode;
};

export function CoffeeShopDarkScreen({ layout = 'fullscreen' }: Props) {
  const positionSx =
    layout === 'fullscreen'
      ? { position: 'fixed' as const, inset: 0 }
      : { position: 'absolute' as const, inset: 0 };

  return (
    <Box
      aria-hidden
      sx={{
        ...positionSx,
        zIndex: 1,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 90% 80% at 50% 42%, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.62) 68%, rgba(0, 0, 0, 0.88) 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.38)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 160px 56px rgba(0, 0, 0, 0.58)',
        },
      }}
    />
  );
}
