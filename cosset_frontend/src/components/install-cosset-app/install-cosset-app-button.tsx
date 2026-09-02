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
  checkPwaAlreadyInstalled,
  getPwaInstallState,
  getPwaInstallUnavailableReason,
  isIosSafari,
  promptInstallCossetApp,
  refreshPwaInstallState,
  subscribePwaInstallState,
  waitForInstallPrompt,
} from 'src/utils/pwa-install';

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
    const sync = () => {
      const state = getPwaInstallState();
      setCanInstall(state.canInstall);
      setInstalled(state.installed);
    };

    sync();
    refreshPwaInstallState().then(sync).catch(() => undefined);
    return subscribePwaInstallState(sync);
  }, []);

  const handleInstall = useCallback(async () => {
    if (await checkPwaAlreadyInstalled()) {
      setInstalled(true);
      setCanInstall(false);
      toast.success('Cosset is already installed on this device.');
      return;
    }

    if (isIosSafari()) {
      setIosHelpOpen(true);
      return;
    }

    try {
      setBusy(true);

      const status = await waitForInstallPrompt({ timeoutMs: 12000 });
      if (status === 'installed') {
        setInstalled(true);
        setCanInstall(false);
        toast.success('Cosset is already installed on this device.');
        return;
      }

      if (status !== 'ready') {
        toast.error(await getPwaInstallUnavailableReason());
        return;
      }

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

      toast.error(await getPwaInstallUnavailableReason());
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
      {installed ? 'Cosset installed' : busy ? 'Preparing install…' : label}
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
