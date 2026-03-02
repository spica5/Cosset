'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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
  const [roomInfoVisible, setRoomInfoVisible] = useState(true);

  const isUniverseViewPage = pathname?.includes('/universe/') && pathname?.includes('/view');
  const currentPathWithHash = pathname || '/';

  useEffect(() => {
    const handleRoomInfoState = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') {
        setRoomInfoVisible(customEvent.detail.visible);
      }
    };

    window.addEventListener('room-info-state', handleRoomInfoState as EventListener);

    return () => {
      window.removeEventListener('room-info-state', handleRoomInfoState as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isUniverseViewPage) {
      setRoomInfoVisible(true);
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
                  href={`${currentPathWithHash}#books-section`}
                  color="inherit"
                  underline="none"
                  sx={menuLinkSx}
                >
                  Books
                </Link>
              </Box>
            ) : null,
            rightArea: (
              <Box gap={{ [layoutQuery]: 1 }} display="flex" alignItems="center">
                {/* -- Room Info Toggle -- */}
                {isUniverseViewPage && (
                  <IconButton
                    aria-label={roomInfoVisible ? 'hide room info' : 'show room info'}
                    onClick={() => {
                      window.dispatchEvent(new Event('toggle-room-info'));
                    }}
                    sx={{
                      border: 1,
                      borderColor: 'text.secondary',
                      color: 'info.main',
                      bgcolor: (theme: Theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.5),
                      '&:hover': {
                        borderColor: 'text.secondary',
                        bgcolor: (theme: Theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.7),
                        color: 'info.lighter',
                      },
                    }}
                  >
                    {roomInfoVisible ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </Box>
            ),
          }}
        />
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
