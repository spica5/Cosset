'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';

import { DesignSpaceThemeProvider, useDesignSpaceTheme } from '../landing/design-space-theme-context';

import { useCustomerDesignSpaceType } from './use-customer-design-space-type';

// ----------------------------------------------------------------------

type Props = {
  customerId?: string;
  children: ReactNode;
};

function UniverseDesignSpacePageShellInner({ children }: { children: ReactNode }) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: spaceTheme.pageBg,
        color: spaceTheme.textPrimary,
      }}
    >
      {children}
    </Box>
  );
}

export function UniverseDesignSpacePageShell({ customerId, children }: Props) {
  const { designType } = useCustomerDesignSpaceType(customerId);

  return (
    <DesignSpaceThemeProvider designType={designType}>
      <UniverseDesignSpacePageShellInner>{children}</UniverseDesignSpacePageShellInner>
    </DesignSpaceThemeProvider>
  );
}
