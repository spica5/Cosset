'use client';

import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  disablePhoneNotifications,
  enablePhoneNotifications,
  getBrowserPushSupport,
  getPushStatus,
  registerCossetServiceWorker,
} from 'src/utils/web-push-client';

import { toast } from 'src/components/dashboard/snackbar';

// ----------------------------------------------------------------------

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function FriendNotifySetupBanner() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supportReason, setSupportReason] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const browserSupported = !supportReason;

  useEffect(() => {
    let mounted = true;

    const support = getBrowserPushSupport();
    if (!support.supported) {
      setSupportReason(support.reason || 'Push notifications are not available here');
    } else {
      setSupportReason(null);
      registerCossetServiceWorker().catch(() => undefined);
    }

    getPushStatus()
      .then((status) => {
        if (!mounted) return;
        setConfigured(Boolean(status.configured));
        setPushEnabled(Boolean(status.enabled));
      })
      .catch(() => {
        if (mounted) setConfigured(false);
      });

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const handleTogglePush = useCallback(async (_: unknown, checked: boolean) => {
    try {
      setBusy(true);
      if (checked) {
        await enablePhoneNotifications();
        setPushEnabled(true);
        toast.success('Phone notifications enabled');
      } else {
        await disablePhoneNotifications();
        setPushEnabled(false);
        toast.success('Phone notifications disabled');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update notifications');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      toast.info(
        'On your phone: open Cosset in the browser, then use the menu → Add to Home Screen / Install app.',
      );
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      toast.error('Could not open the install prompt');
    }
  }, [installPrompt]);

  return (
    <Alert
      severity={supportReason ? 'warning' : 'info'}
      variant="outlined"
      sx={{ mb: 3, alignItems: 'flex-start' }}
      action={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
          <Button size="small" variant="outlined" onClick={handleInstall}>
            Add phone shortcut
          </Button>
        </Stack>
      }
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Friend activity on your phone
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.25, color: 'text.secondary' }}>
        Install Cosset as a home-screen shortcut, enable notifications, then turn on the toggle on
        each friend card. By default you get no friend activity alerts.
      </Typography>

      {supportReason ? (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
          {supportReason}
        </Typography>
      ) : !configured ? (
        <Typography variant="caption" color="warning.main">
          Server push keys are not configured yet (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Restart the
          API after adding them.
        </Typography>
      ) : (
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={pushEnabled}
                disabled={busy || !browserSupported}
                onChange={handleTogglePush}
                color="warning"
              />
            }
            label={pushEnabled ? 'Phone notifications on' : 'Phone notifications off'}
          />
        </Box>
      )}
    </Alert>
  );
}
