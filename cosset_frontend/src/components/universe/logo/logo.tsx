import type { BoxProps } from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

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
  ({ href = '/', isSingle = true, disableLink = false, sx, className, ...other }, ref) => {

    const singleLogo = (
      <Box
        alt="Single logo"
        component="img"
        src={`${CONFIG.universe.assetsDir}/logo/logo-single.png`}
        width="100%"
        height="100%"
      />
    );

    const fullLogo = (
      <Box
        alt="Full logo"
        component="img"
        src={`${CONFIG.universe.assetsDir}/logo/logo-full.png`}
        width="100%"
        height="100%"
      />
    );

    const baseStyles = {
      flexShrink: 0,
      color: 'inherit',
      display: 'inline-flex',
      verticalAlign: 'middle',
      width: isSingle ? 102 : 150,
      height: isSingle ? 64 : 50,
      ...sx,
    } as CSSObject;

    return (
      <Box
        ref={ref}
        component={RouterLink}
        href={href}
        className={logoClasses.root.concat(className ? ` ${className}` : '')}
        aria-label="logo"
        sx={{
          ...baseStyles,
          ...(disableLink && { pointerEvents: 'none' }),
        }}
        {...other}
      >
        {isSingle ? singleLogo : fullLogo}
      </Box>
    );
  }
);
