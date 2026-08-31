'use client';

import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import {
  setCinemaNotifySchedule,
  useGetCinemaNotificationPrefs,
} from 'src/actions/cinema-notification-prefs';

import {
  enablePhoneNotifications,
  getBrowserPushSupport,
  getPushStatus,
} from 'src/utils/web-push-client';

import { CINEMA_CREAM, CINEMA_GOLD } from './cinema-theater-theme';

// ----------------------------------------------------------------------

type Props = {
  enabled?: boolean;
};

export function CinemaNotificationSettings({ enabled = true }: Props) {
  const { notifySchedule, pushReady, prefsLoading } = useGetCinemaNotificationPrefs(enabled);
  const [busy, setBusy] = useState(false);
  const [localPushReady, setLocalPushReady] = useState(pushReady);

  useEffect(() => {
    setLocalPushReady(pushReady);
  }, [pushReady]);

  const handleToggle = useCallback(async (_: unknown, checked: boolean) => {
    try {
      setBusy(true);

      let phonePushOk = false;
      if (checked) {
        const support = getBrowserPushSupport();
        if (!support.supported) {
          toast.warning(support.reason || 'Phone push is not available on this device/browser.');
        } else {
          try {
            await enablePhoneNotifications();
            const status = await getPushStatus();
            phonePushOk = Boolean(status.enabled);
            setLocalPushReady(phonePushOk);
          } catch (error) {
            toast.warning(
              error instanceof Error
                ? `${error.message} In-app bell alerts will still work.`
                : 'Could not enable phone push. In-app bell alerts will still work.',
            );
          }
        }
      }

      const result = await setCinemaNotifySchedule(checked, checked);
      if (checked && result.testSent) {
        toast.success(
          phonePushOk || localPushReady
            ? 'Cinema alerts on — check your phone notification and the bell icon'
            : 'Cinema alerts on — check the bell icon (phone push not ready on this device)',
        );
      } else {
        toast.success(
          checked
            ? 'You will be notified about new cinema schedules and upcoming movies'
            : 'Cinema schedule notifications are off',
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update cinema notifications');
    } finally {
      setBusy(false);
    }
  }, [localPushReady]);

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderRadius: 2,
        border: `1px solid ${CINEMA_GOLD}55`,
        bgcolor: 'rgba(8,5,3,0.72)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Iconify
            icon="solar:bell-bing-bold"
            width={22}
            sx={{ color: CINEMA_GOLD, mt: 0.15, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.92rem',
                color: CINEMA_CREAM,
                lineHeight: 1.3,
              }}
            >
              Cinema schedule alerts
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(245,230,200,0.68)', display: 'block', lineHeight: 1.4 }}
            >
              Get notified when a new cinema schedule is posted and when upcoming movies are added.
              Off by default. Use Chrome/Edge (or installed Cosset app) on the phone.
            </Typography>
            {notifySchedule ? (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: localPushReady ? 'success.light' : 'warning.light',
                  fontWeight: 600,
                }}
              >
                {localPushReady
                  ? 'Phone push ready for this device'
                  : 'Phone push not ready — alerts still appear in the Cosset bell'}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        <FormControlLabel
          sx={{ mx: 0, flexShrink: 0 }}
          control={
            <Switch
              size="small"
              color="warning"
              checked={notifySchedule}
              disabled={!enabled || busy || prefsLoading}
              onChange={handleToggle}
            />
          }
          label={
            <Typography variant="caption" sx={{ color: CINEMA_CREAM, fontWeight: 600 }}>
              {notifySchedule ? 'On' : 'Off'}
            </Typography>
          }
        />
      </Stack>
    </Box>
  );
}
