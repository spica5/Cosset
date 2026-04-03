'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { varAlpha } from 'src/theme/universe/styles';
import { useUniverseHomeSpaceAccess } from 'src/sections/universe/universe/view/use-universe-home-space-access';

import { Logo } from 'src/components/universe/logo';
import { MenuButton } from 'src/layouts/universe/components/menu-button';

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
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<HTMLElement | null>(null);

  const isUniverseViewPage = pathname?.includes('/universe/') && pathname?.includes('/view');
  const universeViewMatch = pathname?.match(/^\/universe\/([^/]+)\/view(?:\/|$)/);
  const universeCustomerId = universeViewMatch?.[1] ? decodeURIComponent(universeViewMatch[1]) : '';
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(universeCustomerId);
  const showUniverseSectionLinks =
    isUniverseViewPage && !isAccessLoading && !isVisitorHomeSpaceOnly;
  const currentPathWithHash = pathname || '/';
  const mobileMenuOpen = Boolean(mobileMenuAnchorEl);

  const handleOpenMobileMenu = (event: { currentTarget: HTMLElement }) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuAnchorEl(null);
  };

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
    px: { xs: 1.5, sm: 3 },
    py: { xs: 0.5, sm: 0.75 },
    borderRadius: 1,
    border: 1,
    borderColor: 'text.secondary',
    bgcolor: (theme: Theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.5),
    color: 'info.main',
    typography: 'subtitle1',
    fontSize: { xs: '0.75rem', sm: '1rem' },
    whiteSpace: 'nowrap',
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
                  <Logo
                    isSingle
                    sx={{
                      width: { xs: 60, sm: 72, md: 84 },
                      height: { xs: 34, sm: 40, md: 48 },
                      flexShrink: 0,
                    }}
                  />
                </>
              ),
              centerArea: showUniverseSectionLinks ? (
                <Box
                  gap={{ xs: 1.5, sm: 3, md: 5 }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    overflowX: 'auto',
                    flexWrap: 'nowrap',
                    maxWidth: '100%',
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}
                >
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
                    href={`${currentPathWithHash}#drawers-section`}
                    color="inherit"
                    underline="none"
                    sx={menuLinkSx}
                  >
                    Drawers
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
              rightArea: (
                <Box gap={{ [layoutQuery]: 1 }} display="flex" alignItems="center">
                  {showUniverseSectionLinks ? (
                    <>
                      <MenuButton
                        aria-label="open section menu"
                        onClick={handleOpenMobileMenu}
                        sx={{
                          ml: 0.5,
                          display: { xs: 'inline-flex', md: 'none' },
                        }}
                      />

                      <Menu
                        anchorEl={mobileMenuAnchorEl}
                        open={mobileMenuOpen}
                        onClose={handleCloseMobileMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                          paper: {
                            sx: {
                              minWidth: 180,
                              border: 1,
                              borderColor: 'divider',
                            },
                          },
                        }}
                      >
                        <MenuItem
                          component={RouterLink}
                          href={`${currentPathWithHash}#blogs-section`}
                          onClick={handleCloseMobileMenu}
                        >
                          Blogs
                        </MenuItem>
                        <MenuItem
                          component={RouterLink}
                          href={`${currentPathWithHash}#albums-section`}
                          onClick={handleCloseMobileMenu}
                        >
                          Albums
                        </MenuItem>
                        <MenuItem
                          component={RouterLink}
                          href={`${currentPathWithHash}#drawers-section`}
                          onClick={handleCloseMobileMenu}
                        >
                          Drawers
                        </MenuItem>
                        <MenuItem
                          component={RouterLink}
                          href={`${currentPathWithHash}#collection-items-section`}
                          onClick={handleCloseMobileMenu}
                        >
                          Collections
                        </MenuItem>
                      </Menu>
                    </>
                  ) : null}
                </Box>
              ),
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
