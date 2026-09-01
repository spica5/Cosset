'use client';

import { useEffect } from 'react';

import { ensurePwaInstallListeners } from 'src/utils/pwa-install';
import { registerCossetServiceWorker } from 'src/utils/web-push-client';

/**
 * Captures the browser install prompt as early as possible and registers the SW
 * so Install Cosset app can call prompt() directly.
 */
export function InstallCossetAppBootstrap() {
  useEffect(() => {
    ensurePwaInstallListeners();
    registerCossetServiceWorker().catch(() => undefined);
  }, []);

  return null;
}
