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
  ({ href = '/', isSingle = false, disableLink = false, sx, className, ...other }, ref) => {
    const lightSrc = `${CONFIG.universe.assetsDir}/logo/${isSingle ? 'logo-single' : 'logo-full'}.png`;
    const darkSrc = `${CONFIG.universe.assetsDir}/logo/${isSingle ? 'logo-single' : 'logo-full'}-dark.png`;

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
        {/* Light logo — hidden in dark mode */}
        <Box
          alt="logo"
          component="img"
          src={lightSrc}
          width="100%"
          height="100%"
          sx={{
            display: 'block',
            '[data-mui-color-scheme="dark"] &': { display: 'none' },
          }}
        />
        {/* Dark logo — shown only in dark mode */}
        <Box
          alt="logo"
          component="img"
          src={darkSrc}
          width="100%"
          height="100%"
          sx={{
            display: 'none',
            '[data-mui-color-scheme="dark"] &': { display: 'block' },
          }}
        />
      </Box>
    );
  }
);
