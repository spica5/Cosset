import type { BoxProps } from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

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
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const singleLogoSrc = `${CONFIG.universe.assetsDir}/logo/logo-single${isDarkMode ? '-dark' : ''}.png`;
    const fullLogoSrc = `${CONFIG.universe.assetsDir}/logo/logo-full${isDarkMode ? '-dark' : ''}.png`;

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget as HTMLImageElement;
      // Fallback to light logo if dark version fails to load
      if (isDarkMode && img.src.includes('-dark')) {
        img.src = img.src.replace('-dark', '');
      }
    };

    const singleLogo = (
      <Box
        key={`single-${isDarkMode}`}
        alt="Single logo"
        component="img"
        src={singleLogoSrc}
        width="100%"
        height="100%"
        onError={handleImageError}
      />
    );

    const fullLogo = (
      <Box
        key={`full-${isDarkMode}`}
        alt="Full logo"
        component="img"
        src={fullLogoSrc}
        width="100%"
        height="100%"
        onError={handleImageError}
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
