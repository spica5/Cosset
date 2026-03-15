'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { varAlpha } from 'src/theme/universe/styles';

import { Logo } from 'src/components/universe/logo';

import { Main } from './main';
import { UniverseFooter } from './universe-footer';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';

// ----------------------------------------------------------------------

export type UniverseLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export function UniverseLayout({ sx, children, header }: UniverseLayoutProps) {
  const layoutQuery: Breakpoint = 'md';
  const pathname = usePathname();
  const [showTopMenu, setShowTopMenu] = useState(true);

  const isUniverseViewPage = pathname?.includes('/universe/') && pathname?.includes('/view');
  const currentPathWithHash = pathname || '/';

  useEffect(() => {
    const handleToggleTopMenu = () => {
      setShowTopMenu((prev) => !prev);
    };

    const handleSetTopMenuState = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') {
        setShowTopMenu(customEvent.detail.visible);
      }
    };

    window.addEventListener('toggle-top-menu', handleToggleTopMenu);
    window.addEventListener('set-top-menu-state', handleSetTopMenuState as EventListener);

    return () => {
      window.removeEventListener('toggle-top-menu', handleToggleTopMenu);
      window.removeEventListener('set-top-menu-state', handleSetTopMenuState as EventListener);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('top-menu-state', {
        detail: { visible: showTopMenu },
      })
    );
  }, [showTopMenu]);

  useEffect(() => {
    if (!isUniverseViewPage) {
      setShowTopMenu(true);
    }
  }, [isUniverseViewPage]);

  const menuLinkSx = {
    px: 3,
    py: 0.75,
    borderRadius: 1,
    border: 1,
    borderColor: 'text.secondary',
    bgcolor: (theme: Theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.5),
    color: 'info.main',
    typography: 'subtitle1',
    transition: (theme: Theme) =>
      theme.transitions.create(['background-color', 'border-color', 'color'], {
        duration: theme.transitions.duration.shorter,
      }),
    '&:hover': {
      borderColor: 'text.secondary',
      bgcolor: (theme: Theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.7),
      color: 'info.lighter',
    },
  } as const;

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        isUniverseViewPage && !showTopMenu ? null : (
          <HeaderSection
            layoutQuery={layoutQuery}
            sx={header?.sx}
            slots={{
              topArea: (
                <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                  This is an info Alert.
                </Alert>
              ),
              leftArea: (
                <>
                  {/* -- Logo -- */}
                  <Logo />
                </>
              ),
              centerArea: isUniverseViewPage ? (
                <Box gap={5} display="flex" alignItems="center" justifyContent="center">
                  <Link
                    component={RouterLink}
                    href={`${currentPathWithHash}#blogs-section`}
                    color="inherit"
                    underline="none"
                    sx={menuLinkSx}
                  >
                    Blogs
                  </Link>

                  <Link
                    component={RouterLink}
                    href={`${currentPathWithHash}#albums-section`}
                    color="inherit"
                    underline="none"
                    sx={menuLinkSx}
                  >
                    Albums
                  </Link>
                  <Link
                    component={RouterLink}
                    href={`${currentPathWithHash}#drawer-section`}
                    color="inherit"
                    underline="none"
                    sx={menuLinkSx}
                  >
                    Drawer
                  </Link>
                  <Link
                    component={RouterLink}
                    href={`${currentPathWithHash}#collection-items-section`}
                    color="inherit"
                    underline="none"
                    sx={menuLinkSx}
                  >
                    Collections
                  </Link>
                </Box>
              ) : null,
              rightArea: <Box gap={{ [layoutQuery]: 1 }} display="flex" alignItems="center" />,
            }}
          />
        )
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={<UniverseFooter />}
      /** **************************************
       * Style
       *************************************** */
      sx={sx}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}
