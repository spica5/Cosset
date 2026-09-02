import 'src/global.css';

// ----------------------------------------------------------------------

import type { Metadata, Viewport } from 'next';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { CONFIG } from 'src/config-global';
import { LocalizationProvider } from 'src/locales';
import { schemeConfig } from 'src/theme/universe/scheme-config';
import { ThemeProvider } from 'src/theme/universe/theme-provider';

import { ProgressBar } from 'src/components/universe/progress-bar';
import { MotionLazy } from 'src/components/universe/animate/motion-lazy';
import { Snackbar } from 'src/components/dashboard/snackbar';
import { InstallCossetAppBootstrap, PwaInstallHeadScript } from 'src/components/install-cosset-app';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/universe/settings';

import { AuthProvider } from 'src/auth/context/jwt';
import { AuthSocialProvider } from 'src/auth/components/auth-social-provider';

// ----------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  icons: [
    {
      rel: 'icon',
      url: `${CONFIG.universe.assetsDir}/favicon.ico`,
    },
    {
      rel: 'apple-touch-icon',
      url: '/icons/cosset-192.png',
    },
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Cosset',
    statusBarStyle: 'black-translucent',
  },
};

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PwaInstallHeadScript />
        <InitColorSchemeScript
          defaultMode={schemeConfig.defaultMode}
          modeStorageKey={schemeConfig.modeStorageKey}
        />

        <AuthProvider>
          <AuthSocialProvider>
            <LocalizationProvider>
              <SettingsProvider settings={defaultSettings}>
                <ThemeProvider>
                  <MotionLazy>
                    <InstallCossetAppBootstrap />
                    <ProgressBar />
                    <SettingsDrawer />
                    <Snackbar />
                    {children}
                  </MotionLazy>
                </ThemeProvider>
              </SettingsProvider>
            </LocalizationProvider>
          </AuthSocialProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
