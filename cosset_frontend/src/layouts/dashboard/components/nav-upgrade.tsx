import type { StackProps } from '@mui/material/Stack';

import { m } from 'framer-motion';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha as hexAlpha } from '@mui/material/styles';

import { getS3SignedUrl } from 'src/utils/helper';

import { CONFIG } from 'src/config-global';
import { varAlpha, bgGradient } from 'src/theme/dashboard/styles';

import { Label } from 'src/components/dashboard/label';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const PLAN_TYPE_BADGE_MAP: Record<string, { label: string; color: 'primary' | 'error' | 'warning' }> = {
  'FREE': { label: 'FREE', color: 'primary' },
  'PAID': { label: 'PLUS', color: 'error' },
  'EXTRA-PAID': { label: 'PRO', color: 'warning' },
};

export function NavUpgrade({ sx, ...other }: StackProps) {
  const { user } = useAuthContext();
  const [signedPhotoURL, setSignedPhotoURL] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolvePhotoUrl = async () => {
      const photoKey = user?.photoURL;

      if (!photoKey) {
        if (mounted) setSignedPhotoURL('');
        return;
      }

      if (photoKey.startsWith('http://') || photoKey.startsWith('https://')) {
        if (mounted) setSignedPhotoURL(photoKey);
        return;
      }

      const signedUrl = await getS3SignedUrl(photoKey);
      if (mounted) {
        setSignedPhotoURL(signedUrl || '');
      }
    };

    resolvePhotoUrl();

    return () => {
      mounted = false;
    };
  }, [user?.photoURL]);

  const planType = user?.plan || 'FREE';
  const badgeConfig = PLAN_TYPE_BADGE_MAP[planType] || PLAN_TYPE_BADGE_MAP.FREE;

  return (
    <Stack sx={{ px: 2, py: 5, textAlign: 'center', ...sx }} {...other}>
      <Stack alignItems="center">
        <Box sx={{ position: 'relative' }}>
          <Avatar src={signedPhotoURL || undefined} alt={user?.displayName} sx={{ width: 48, height: 48 }}>
            {user?.displayName?.charAt(0).toUpperCase()}
          </Avatar>

          <Label
            color={badgeConfig.color}
            variant="filled"
            sx={{
              top: -6,
              px: 0.5,
              left: 40,
              height: 20,
              position: 'absolute',
              borderBottomLeftRadius: 2,
            }}
          >
            {badgeConfig.label}
          </Label>
        </Box>

        <Stack spacing={0.5} sx={{ mb: 2, mt: 1.5, width: 1 }}>
          <Typography
            variant="subtitle2"
            noWrap
            sx={{ color: 'var(--layout-nav-text-primary-color)' }}
          >
            {user?.displayName}
          </Typography>

          <Typography
            variant="body2"
            noWrap
            sx={{ color: 'var(--layout-nav-text-disabled-color)' }}
          >
            {user?.email}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function UpgradeBlock({ sx, ...other }: StackProps) {
  return (
    <Stack
      sx={{
        ...bgGradient({
          color: `135deg, ${hexAlpha('#F7BB95', 0.92)}, ${hexAlpha('#5B2FF3', 0.92)}`,
          imgUrl: `${CONFIG.dashboard.assetsDir}/assets/background/background-7.webp`,
        }),
        px: 3,
        py: 4,
        borderRadius: 2,
        position: 'relative',
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          borderRadius: 2,
          position: 'absolute',
          border: (theme) => `solid 3px ${varAlpha(theme.vars.palette.common.whiteChannel, 0.16)}`,
        }}
      />

      <Box
        component={m.img}
        animate={{ y: [12, -12, 12] }}
        transition={{
          duration: 8,
          ease: 'linear',
          repeat: Infinity,
          repeatDelay: 0,
        }}
        alt="Small Rocket"
        src={`${CONFIG.dashboard.assetsDir}/assets/illustrations/illustration-rocket-small.webp`}
        sx={{ right: 0, width: 112, height: 112, position: 'absolute' }}
      />

      <Stack alignItems="flex-start" sx={{ position: 'relative' }}>
        <Box component="span" sx={{ typography: 'h5', color: 'common.white' }}>
          35% OFF
        </Box>

        <Box
          component="span"
          sx={{ mb: 2, mt: 0.5, color: 'common.white', typography: 'subtitle2' }}
        >
          Power up Productivity!
        </Box>

        <Button variant="contained" size="small" color="warning">
          Upgrade to Pro
        </Button>
      </Stack>
    </Stack>
  );
}
