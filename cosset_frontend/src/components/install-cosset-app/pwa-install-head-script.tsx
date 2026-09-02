import Script from 'next/script';

/**
 * Runs before React so Chrome's beforeinstallprompt is never missed.
 */
export function PwaInstallHeadScript() {
  return <Script src="/pwa-install-init.js" strategy="beforeInteractive" />;
}
