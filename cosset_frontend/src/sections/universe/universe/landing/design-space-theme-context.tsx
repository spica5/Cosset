'use client';

import type { ReactNode } from 'react';
import type { DesignSpaceType, DesignSpaceTheme } from 'src/utils/design-space-type';

import { createContext, useContext, useMemo } from 'react';

import { createTheme, ThemeProvider } from '@mui/material/styles';

import {
  DEFAULT_DESIGN_SPACE_TYPE,
  getDesignSpaceTheme,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

// ----------------------------------------------------------------------

type DesignSpaceThemeContextValue = {
  designType: DesignSpaceType;
  theme: DesignSpaceTheme;
};

const DesignSpaceThemeContext = createContext<DesignSpaceThemeContextValue>({
  designType: DEFAULT_DESIGN_SPACE_TYPE,
  theme: getDesignSpaceTheme(DEFAULT_DESIGN_SPACE_TYPE),
});

export function useDesignSpaceTheme() {
  return useContext(DesignSpaceThemeContext);
}

type ProviderProps = {
  designType?: DesignSpaceType;
  /** Enable nested MUI palette overrides for My Space sections only. */
  withMuiTheme?: boolean;
  children: ReactNode;
};

export function DesignSpaceThemeProvider({
  designType,
  withMuiTheme = false,
  children,
}: ProviderProps) {
  const resolvedDesignType = normalizeDesignSpaceType(designType);
  const spaceTheme = useMemo(
    () => getDesignSpaceTheme(resolvedDesignType),
    [resolvedDesignType],
  );

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: spaceTheme.isDark ? 'dark' : 'light',
          background: {
            default: spaceTheme.pageBg,
            paper: spaceTheme.surfaceBg,
          },
          text: {
            primary: spaceTheme.textPrimary,
            secondary: spaceTheme.textSecondary,
          },
          divider: spaceTheme.divider,
        },
      }),
    [spaceTheme],
  );

  const contextValue = useMemo(
    () => ({
      designType: resolvedDesignType,
      theme: spaceTheme,
    }),
    [resolvedDesignType, spaceTheme],
  );

  return (
    <DesignSpaceThemeContext.Provider value={contextValue}>
      {withMuiTheme ? <ThemeProvider theme={muiTheme}>{children}</ThemeProvider> : children}
    </DesignSpaceThemeContext.Provider>
  );
}
