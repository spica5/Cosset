'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';

import { Section } from './section';
import { Main, Content } from './main';
import { LayoutSection } from '../../core/layout-section';

// ----------------------------------------------------------------------

export type AuthSplitLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  section?: {
    title?: string;
    images?: string[];
  };
};

export function AuthSplitLayout({ sx, section, children }: AuthSplitLayoutProps) {
  const layoutQuery: Breakpoint = 'md';

  return (
    <LayoutSection
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      sx={sx}
      cssVars={{
        '--layout-auth-content-width': '480px',
      }}
    >
      <Main layoutQuery={layoutQuery}>
        <Content layoutQuery={layoutQuery}>{children}</Content>
        <Section
          layoutQuery={layoutQuery}
          title={section?.title ?? 'Hi, Welcome Back'}
          images={
            section?.images ?? [
              `${CONFIG.universe.assetsDir}/assets/images/auth/auth-1.webp`,
              `${CONFIG.universe.assetsDir}/assets/images/auth/auth-2.webp`,
              `${CONFIG.universe.assetsDir}/assets/images/auth/auth-3.webp`,
            ]
          }
        />
      </Main>
    </LayoutSection>
  );
}
