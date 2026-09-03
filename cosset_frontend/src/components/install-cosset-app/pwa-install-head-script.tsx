import { PWA_INSTALL_INIT_SCRIPT } from './pwa-install-init-script';

/**
 * Inline script runs immediately (no preload) so Chrome's beforeinstallprompt
 * is captured before React hydrates, without service-worker preload warnings.
 */
export function PwaInstallHeadScript() {
  return (
    <script
      id="cosset-pwa-install-init"
      dangerouslySetInnerHTML={{ __html: PWA_INSTALL_INIT_SCRIPT }}
    />
  );
}
