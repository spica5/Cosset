'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CINEMA_GOLD, CINEMA_SERIF } from './cinema-theater-theme';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  accent?: string;
  align?: 'left' | 'center';
};

/**
 * Decorative ribbon banner used above cinema film carousels.
 */
export function CinemaRibbonTitle({ title, accent = CINEMA_GOLD, align = 'center' }: Props) {
  const ribbonFill = `linear-gradient(180deg, ${accent} 0%, #8F6B18 55%, #6E5212 100%)`;
  const foldColor = '#5A4210';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 3, md: 4 },
        py: { xs: 0.5, md: 0.5 },
        mx: align === 'center' ? 'auto' : 0,
        maxWidth: 1,
        bgcolor: 'transparent',
        background: ribbonFill,
        color: '#1A1208',
        boxShadow: `0 10px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)`,
        // Notch/fold shape for a ribbon look
        clipPath:
          'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          bottom: -8,
          width: 14,
          height: 10,
          bgcolor: foldColor,
          zIndex: -1,
        },
        '&::before': {
          left: 10,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        },
        '&::after': {
          right: 10,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: CINEMA_SERIF,
          fontWeight: 700,
          fontSize: { xs: '0.82rem', sm: '0.92rem', md: '1.05rem' },
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.35,
          color: '#1A1208',
          textShadow: '0 1px 0 rgba(255,255,255,0.18)',
          px: { xs: 1, md: 1.5 },
          whiteSpace: { xs: 'normal', sm: 'nowrap' },
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}
