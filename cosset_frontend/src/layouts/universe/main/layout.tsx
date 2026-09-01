'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

import { usePathname } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';
import { InstallCossetAppButton } from 'src/components/install-cosset-app';

import { Main } from './main';
import { Footer } from './footer';
import { HomeFooter } from './home-footer';
import { Searchbar } from '../components/searchbar';
import { NavAccountPopover } from './nav/nav-account';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';

// ----------------------------------------------------------------------

export type MainLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export function MainLayout({ sx, children, header }: MainLayoutProps) {
  const pathname = usePathname();

  const homePage = pathname === '/home/';

  const layoutQuery: Breakpoint = 'md';

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
            rightArea: (
              <Box gap={{ xs: 0.5, [layoutQuery]: 1 }} display="flex" alignItems="center">
                <InstallCossetAppButton
                  variant="button"
                  size="small"
                  color="inherit"
                  buttonVariant="outlined"
                  label="Install app"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    borderColor: 'currentColor',
                    color: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                />
                <InstallCossetAppButton
                  variant="icon"
                  sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'inherit' }}
                />
                {/* -- Searchbar -- */}
                <Searchbar />
                {/* -- Account Navbar -- */}
                <NavAccountPopover />
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={homePage ? <HomeFooter /> : <Footer layoutQuery={layoutQuery} />}
      /** **************************************
       * Style
       *************************************** */
      sx={sx}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}
