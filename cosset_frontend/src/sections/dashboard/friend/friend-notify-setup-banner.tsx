'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  getPushStatus,
  getBrowserPushSupport,
  enablePhoneNotifications,
  disablePhoneNotifications,
  registerCossetServiceWorker,
} from 'src/utils/web-push-client';

import { toast } from 'src/components/dashboard/snackbar';
import { InstallCossetAppButton } from 'src/components/install-cosset-app';

// ----------------------------------------------------------------------

export function FriendNotifySetupBanner() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supportReason, setSupportReason] = useState<string | null>(null);

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

    return () => {
      mounted = false;
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

  return (
    <Alert
      severity={supportReason ? 'warning' : 'info'}
      variant="outlined"
      sx={{
        mb: 3,
        alignItems: 'flex-start',
        '& .MuiAlert-message': {
          width: 1,
          minWidth: 0,
          py: 0.25,
        },
        '& .MuiAlert-action': {
          display: 'none',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ width: 1 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
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
              Server push keys are not configured yet (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Restart
              the API after adding them.
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
        </Box>

        <InstallCossetAppButton
          size="small"
          color="inherit"
          buttonVariant="outlined"
          label="Install Cosset app"
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            minHeight: 36,
          }}
        />
      </Stack>
    </Alert>
  );
}
