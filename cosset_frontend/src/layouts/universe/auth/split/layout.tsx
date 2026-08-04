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
          title={section?.title ?? 'Hi, Welcome to Cosset!'}
          images={
            section?.images ?? [
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin1.png`,
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin2.png`,
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin3.png`,
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin4.png`,
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin5.png`,
              `${CONFIG.dashboard.assetsDir}/assets/images/singin/back_signin6.png`,
            ]
          }
        />
      </Main>
    </LayoutSection>
  );
}
