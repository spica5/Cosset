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

function UniverseLandingBookshelfPageContent({ children }: { children: ReactNode }) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Box
      id="bookshelf-section"
      sx={{
        minHeight: '100dvh',
        height: { xs: 'auto', lg: '100dvh' },
        bgcolor: spaceTheme.pageBg,
        color: spaceTheme.textPrimary,
        overflow: { xs: 'auto', lg: 'hidden' },
        display: 'flex',
        flexDirection: 'column',
        scrollMarginTop: 0,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        px: { xs: 2, md: 2.5 },
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
          overflow: { xs: 'visible', lg: 'hidden' },
          bgcolor: spaceTheme.contentBg,
          color: spaceTheme.textPrimary,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function UniverseLandingBookshelfPage({
  designType = DEFAULT_DESIGN_SPACE_TYPE,
  children,
}: Props) {
  return (
    <DesignSpaceThemeProvider designType={designType} withMuiTheme>
      <UniverseLandingBookshelfPageContent>{children}</UniverseLandingBookshelfPageContent>
    </DesignSpaceThemeProvider>
  );
}
