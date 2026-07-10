'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
} from 'src/utils/design-space-type';

import { useDesignSpaceTheme, DesignSpaceThemeProvider } from './design-space-theme-context';

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
        bgcolor: spaceTheme.pageBg,
        color: spaceTheme.textPrimary,
        overflow: { xs: 'visible', lg: 'hidden' },
        display: 'flex',
        flexDirection: 'column',
        scrollMarginTop: 0,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 0,
          px: { xs: 0, lg: 3 },
          py: { xs: 0, lg: 2 },
          height: 1,
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
