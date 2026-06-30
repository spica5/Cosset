'use client';

import type { ReactNode } from 'react';
import type { DesignSpaceType, DesignSpaceTheme } from 'src/utils/design-space-type';

import { createContext, useContext, useMemo } from 'react';

import { ThemeProvider } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

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

export function getDesignSpaceCardSx(theme: DesignSpaceTheme) {
  if (!theme.isDark) {
    return {};
  }

  return {
    bgcolor: theme.cardBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
  };
}

type DesignSpaceMuiThemeLayerProps = {
  spaceTheme: DesignSpaceTheme;
  children: ReactNode;
};

function DesignSpaceMuiThemeLayer({ spaceTheme, children }: DesignSpaceMuiThemeLayerProps) {
  return (
    <ThemeProvider
      theme={(outerTheme: Theme) => ({
        ...outerTheme,
        palette: {
          ...outerTheme.palette,
          background: {
            ...outerTheme.palette?.background,
            default: spaceTheme.contentBg,
            paper: spaceTheme.surfaceBg,
          },
          text: {
            ...outerTheme.palette?.text,
            primary: spaceTheme.textPrimary,
            secondary: spaceTheme.textSecondary,
          },
          divider: spaceTheme.divider,
        },
      })}
    >
      {children}
    </ThemeProvider>
  );
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

  const contextValue = useMemo(
    () => ({
      designType: resolvedDesignType,
      theme: spaceTheme,
    }),
    [resolvedDesignType, spaceTheme],
  );

  return (
    <DesignSpaceThemeContext.Provider value={contextValue}>
      {withMuiTheme ? (
        <DesignSpaceMuiThemeLayer spaceTheme={spaceTheme}>{children}</DesignSpaceMuiThemeLayer>
      ) : (
        children
      )}
    </DesignSpaceThemeContext.Provider>
  );
}
