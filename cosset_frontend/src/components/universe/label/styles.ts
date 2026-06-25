'use client';

import type { Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import { alpha, styled } from '@mui/material/styles';

import { varAlpha, stylesMode } from 'src/theme/universe/styles';

import type { LabelColor, LabelVariant } from './types';

// ----------------------------------------------------------------------

type PaletteColor = {
  main: string;
  light: string;
  dark: string;
  darker?: string;
  lighter?: string;
  contrastText: string;
  mainChannel?: string;
};

const getPalette = (theme: Theme) => theme.vars?.palette ?? theme.palette;

const getPaletteColor = (theme: Theme, color: Exclude<LabelColor, 'default'>): PaletteColor =>
  getPalette(theme)[color] as PaletteColor;

const getSoftBackground = (theme: Theme, color: Exclude<LabelColor, 'default'>) => {
  const paletteColor = getPaletteColor(theme, color);

  if (paletteColor.mainChannel) {
    return varAlpha(paletteColor.mainChannel, 0.16);
  }

  return alpha(paletteColor.main, 0.16);
};

const getGreySoftBackground = (theme: Theme) => {
  const palette = getPalette(theme);
  const greyChannel = palette.grey['500Channel' as keyof typeof palette.grey];

  if (typeof greyChannel === 'string') {
    return varAlpha(greyChannel, 0.16);
  }

  return alpha(palette.grey[500], 0.16);
};

export const StyledLabel = styled(Box)(({
  theme,
  ownerState: { color, variant },
}: {
  theme: Theme;
  ownerState: {
    color: LabelColor;
    variant: LabelVariant;
  };
}) => {
  const palette = getPalette(theme);

  const defaultColor = {
    ...(color === 'default' && {
      /**
       * @variant filled
       */
      ...(variant === 'filled' && {
        color: palette.common.white,
        backgroundColor: palette.text.primary,
        [stylesMode.dark]: { color: palette.grey[800] },
      }),
      /**
       * @variant outlined
       */
      ...(variant === 'outlined' && {
        backgroundColor: 'transparent',
        color: palette.text.primary,
        border: `2px solid ${palette.text.primary}`,
      }),
      /**
       * @variant soft
       */
      ...(variant === 'soft' && {
        color: palette.text.secondary,
        backgroundColor: getGreySoftBackground(theme),
      }),
      /**
       * @variant inverted
       */
      ...(variant === 'inverted' && {
        color: palette.grey[800],
        backgroundColor: palette.grey[300],
      }),
    }),
  };

  const paletteColor = color !== 'default' ? getPaletteColor(theme, color) : null;
  const toneColor = color !== 'default' ? color : null;

  const styleColors = {
    ...(paletteColor && toneColor && {
      /**
       * @variant filled
       */
      ...(variant === 'filled' && {
        color: paletteColor.contrastText,
        backgroundColor: paletteColor.main,
      }),
      /**
       * @variant outlined
       */
      ...(variant === 'outlined' && {
        backgroundColor: 'transparent',
        color: paletteColor.main,
        border: `2px solid ${paletteColor.main}`,
      }),
      /**
       * @variant soft
       */
      ...(variant === 'soft' && {
        color: paletteColor.dark,
        backgroundColor: getSoftBackground(theme, toneColor),
        [stylesMode.dark]: { color: paletteColor.light },
      }),
      /**
       * @variant inverted
       */
      ...(variant === 'inverted' && {
        color: paletteColor.darker ?? paletteColor.dark,
        backgroundColor: paletteColor.lighter ?? paletteColor.light,
      }),
    }),
  };

  return {
    height: 24,
    minWidth: 24,
    lineHeight: 0,
    cursor: 'default',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    justifyContent: 'center',
    padding: theme.spacing(0, 0.75),
    fontSize: theme.typography.pxToRem(12),
    fontWeight: theme.typography.fontWeightBold,
    borderRadius: theme.shape.borderRadius * 0.75,
    transition: theme.transitions.create('all', {
      duration: theme.transitions.duration.shorter,
    }),
    ...defaultColor,
    ...styleColors,
  };
});
