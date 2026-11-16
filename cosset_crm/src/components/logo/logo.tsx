'use client';

import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/paths';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
  showAdminLabel?: boolean;
};

export function Logo({
  sx,
  disabled,
  className,
  href = paths.dashboard.root,
  isSingle = true,
  showAdminLabel = true,
  ...other
}: LogoProps) {
  const logoSrc = isSingle
    ? `${CONFIG.assetsDir}/logo/logo-single.png`
    : `${CONFIG.assetsDir}/logo/logo-full.png`;

  return (
    <LogoRoot
      component={RouterLink}
      href={href}
      aria-label="Cosset Admin"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          width: 'auto',
          height: 'auto',
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          component="img"
          alt="Cosset"
          src={logoSrc}
          sx={{
            width: isSingle ? 56 : 132,
            height: isSingle ? 56 : 48,
            objectFit: 'contain',
            display: 'block',
          }}
        />

        {showAdminLabel ? (
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: 'var(--layout-nav-text-primary-color, text.primary)',
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
            }}
          >
            Admin
          </Typography>
        ) : null}
      </Stack>
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  display: 'inline-flex',
  verticalAlign: 'middle',
}));
