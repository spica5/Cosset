'use client';

import type { BoxProps } from '@mui/material/Box';

import { forwardRef } from 'react';

import Box from '@mui/material/Box';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = BoxProps & {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    { width, href = '/home', height, isSingle = true, disableLink = false, className, sx, ...other },
    ref
  ) => {

    const singleLogo = (
      <Box
        alt="Single logo"
        component="img"
        src={`${CONFIG.dashboard.assetsDir}/logo/logo-single.png`}
        width="100%"
        height="100%"
      />
    );

    const fullLogo = (
      <Box
        alt="Full logo"
        component="img"
        src={`${CONFIG.dashboard.assetsDir}/logo/logo-full.png`}
        width="100%"
        height="100%"
      />
    );

    const baseSize = {
      width: width ?? 80,
      height: height ?? 50,
      ...(!isSingle && {
        width: width ?? 150,
        height: height ?? 50,
      }),
    };

    return (
      <Box
        ref={ref}
        component={RouterLink}
        href={href}
        className={logoClasses.root.concat(className ? ` ${className}` : '')}
        aria-label="Logo"
        sx={{
          ...baseSize,
          flexShrink: 0,
          display: 'inline-flex',
          verticalAlign: 'middle',
          ...(disableLink && { pointerEvents: 'none' }),
          ...sx,
        }}
        {...other}
      >
        {isSingle ? singleLogo : fullLogo}
      </Box>
    );
  }
);
