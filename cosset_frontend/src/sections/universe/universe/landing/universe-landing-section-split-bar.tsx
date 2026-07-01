'use client';

import Box from '@mui/material/Box';

import { type DesignSpaceType, getDesignSpaceTheme } from 'src/utils/design-space-type';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  designType: DesignSpaceType;
};

export function UniverseLandingSectionSplitBar({ designType }: Props) {
  const spaceTheme = getDesignSpaceTheme(designType);

  return (
    <Box
      role="presentation"
      aria-hidden
      sx={{
        flexShrink: 0,
        bgcolor: spaceTheme.pageBg,
        px: { xs: 2, lg: 3 },
        py: { xs: 1.25, lg: 1.5 },
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(90deg, transparent 0%, ${spaceTheme.divider} 100%)`,
          }}
        />

        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: spaceTheme.accentSoft,
            color: spaceTheme.accent,
            border: `1px solid ${spaceTheme.border}`,
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:book-bookmark-bold" width={15} />
        </Box>

        <Box
          sx={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(90deg, ${spaceTheme.divider} 0%, transparent 100%)`,
          }}
        />
      </Box>
    </Box>
  );
}
