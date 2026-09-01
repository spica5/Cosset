'use client';

import type { ButtonProps } from '@mui/material/Button';
import type { Theme, SxProps } from '@mui/material/styles';

import { useCallback, useEffect, useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import {
  getPwaInstallState,
  isIosSafari,
  promptInstallCossetApp,
  subscribePwaInstallState,
} from 'src/utils/pwa-install';
import { registerCossetServiceWorker } from 'src/utils/web-push-client';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  variant?: 'button' | 'icon' | 'hero';
  label?: string;
  color?: ButtonProps['color'];
  buttonVariant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  sx?: SxProps<Theme>;
  hideWhenUnavailable?: boolean;
};

export function InstallCossetAppButton({
  variant = 'button',
  label = 'Install Cosset app',
  color = 'primary',
  buttonVariant = 'outlined',
  size = 'small',
  sx,
  hideWhenUnavailable = false,
}: Props) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerCossetServiceWorker().catch(() => undefined);

    const sync = () => {
      const state = getPwaInstallState();
      setCanInstall(state.canInstall);
      setInstalled(state.installed);
    };

    sync();
    return subscribePwaInstallState(sync);
  }, []);

  const handleInstall = useCallback(async () => {
    if (installed) {
      toast.success('Cosset is already installed on this device.');
      return;
    }

    if (isIosSafari()) {
      setIosHelpOpen(true);
      return;
    }

    try {
      setBusy(true);
      const outcome = await promptInstallCossetApp();

      if (outcome === 'accepted') {
        setInstalled(true);
        setCanInstall(false);
        toast.success('Cosset app installed');
        return;
      }

      if (outcome === 'dismissed') {
        toast.info('Install cancelled');
        return;
      }

      // Prompt not ready yet — wait briefly for beforeinstallprompt after SW is ready.
      await registerCossetServiceWorker().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 400));
      const retry = await promptInstallCossetApp();

      if (retry === 'accepted') {
        setInstalled(true);
        setCanInstall(false);
        toast.success('Cosset app installed');
        return;
      }

      if (retry === 'dismissed') {
        toast.info('Install cancelled');
        return;
      }

      toast.error(
        'Direct install is not available in this browser yet. Use Chrome/Edge on HTTPS, or open the browser install icon in the address bar.',
      );
    } finally {
      setBusy(false);
    }
  }, [installed]);

  if (installed && hideWhenUnavailable) {
    return null;
  }

  if (hideWhenUnavailable && !canInstall && !installed) {
    return null;
  }

  const iconButton = (
    <Tooltip title={installed ? 'Cosset app installed' : label}>
      <IconButton color="inherit" onClick={handleInstall} aria-label={label} disabled={busy} sx={sx}>
        <Iconify
          icon={installed ? 'solar:check-circle-bold' : 'solar:download-minimalistic-bold'}
          width={22}
        />
      </IconButton>
    </Tooltip>
  );

  const textButton = (
    <Button
      size={size}
      color={color}
      variant={buttonVariant}
      onClick={handleInstall}
      disabled={busy}
      startIcon={
        <Iconify
          icon={installed ? 'solar:check-circle-bold' : 'solar:download-minimalistic-bold'}
          width={variant === 'hero' ? 22 : 18}
        />
      }
      sx={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        ...(variant === 'hero'
          ? {
              px: 2.5,
              py: 1.25,
              fontWeight: 700,
            }
          : null),
        ...sx,
      }}
    >
      {installed ? 'Cosset installed' : busy ? 'Installing…' : label}
    </Button>
  );

  return (
    <>
      {variant === 'icon' ? iconButton : textButton}

      <Dialog open={iosHelpOpen} onClose={() => setIosHelpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Install Cosset on iPhone</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Safari does not allow websites to trigger install automatically. Add Cosset like this:
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2.5, m: 0 }}>
            <li>Tap the Share button</li>
            <li>Choose Add to Home Screen</li>
            <li>Tap Add</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIosHelpOpen(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
