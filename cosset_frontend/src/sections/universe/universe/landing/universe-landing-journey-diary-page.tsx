'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
} from 'src/utils/design-space-type';

import { DesignSpaceThemeProvider, useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

type Props = {
  designType?: DesignSpaceType;
  children: ReactNode;
};

function UniverseLandingJourneyDiaryPageContent({ children }: { children: ReactNode }) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Box
      id="journey-diary-section"
      sx={{
        minHeight: '100dvh',
        height: { xs: 'auto', lg: '100dvh' },
        bgcolor: '#10182B',
        color: spaceTheme.textPrimary,
        overflow: { xs: 'auto', lg: 'hidden' },
        display: 'flex',
        flexDirection: 'column',
        scrollMarginTop: 0,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        px: { xs: 0, lg: 3 },
        py: { xs: 0, lg: 2 },
        backgroundImage:
          'radial-gradient(circle at top left, rgba(255,255,255,0.05), transparent 28%), linear-gradient(180deg, #10182B 0%, #1A2744 100%)',
      }}
    >
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minHeight: { xs: 'min(100dvh, 100%)', lg: 0 },
          height: { lg: 1 },
          display: 'flex',
          flexDirection: 'column',
          overflow: { xs: 'visible', lg: 'auto' },
          bgcolor: 'transparent',
          color: 'common.white',
          borderRadius: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function UniverseLandingJourneyDiaryPage({
  designType = DEFAULT_DESIGN_SPACE_TYPE,
  children,
}: Props) {
  return (
    <DesignSpaceThemeProvider designType={designType} withMuiTheme>
      <UniverseLandingJourneyDiaryPageContent>{children}</UniverseLandingJourneyDiaryPageContent>
    </DesignSpaceThemeProvider>
  );
}
