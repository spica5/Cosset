'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/dashboard/iconify';

import { CINEMA_GOLD, CINEMA_SERIF } from './cinema-theater-theme';
import type { CinemaCategoryMeta } from './cinema-categories';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
  height?: { xs?: number; md?: number };
  showQuote?: boolean;
  showTitles?: boolean;
  footer?: ReactNode;
};

export function CinemaTheaterIntro({
  category,
  height = { xs: 320, md: 480 },
  showQuote = true,
  showTitles = true,
  footer,
}: Props) {
  const accent = category.accent || CINEMA_GOLD;

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        borderRadius: { xs: 2, md: 3 },
        overflow: 'hidden',
        border: `1px solid ${accent}44`,
        boxShadow: `0 28px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset`,
        height,
      }}
    >
      <Box
        component="img"
        src={category.bannerImage}
        alt=""
        sx={{
          position: 'absolute',
          inset: 0,
          width: 1,
          height: 1,
          objectFit: 'cover',
          objectPosition: 'center 42%',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: showTitles
            ? 'linear-gradient(180deg, rgba(8,5,3,0.62) 0%, rgba(8,5,3,0.12) 36%, rgba(8,5,3,0.08) 58%, rgba(8,5,3,0.55) 100%)'
            : 'linear-gradient(180deg, rgba(8,5,3,0.28) 0%, rgba(8,5,3,0.08) 36%, rgba(8,5,3,0.12) 58%, rgba(8,5,3,0.58) 100%)',
          pointerEvents: 'none',
        }}
      />

      {showTitles ? (
        <Stack
          spacing={1.25}
          alignItems="center"
          sx={{
            position: 'absolute',
            top: { xs: 22, md: 40 },
            left: 0,
            right: 0,
            px: 2,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              color: accent,
              letterSpacing: '0.28em',
              fontSize: { xs: '0.72rem', md: '0.88rem' },
              textTransform: 'uppercase',
              fontWeight: 600,
              textShadow: '0 2px 12px rgba(0,0,0,0.55)',
            }}
          >
            {category.eyebrow}
          </Typography>

          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              color: accent,
              fontWeight: 700,
              fontSize: { xs: '1.55rem', sm: '2.15rem', md: '2.85rem' },
              letterSpacing: '0.06em',
              lineHeight: 1.12,
              textTransform: 'uppercase',
              maxWidth: 820,
              textShadow: '0 4px 22px rgba(0,0,0,0.65)',
            }}
          >
            {category.headline}
          </Typography>

          <Typography
            sx={{
              color: 'rgba(245,230,200,0.9)',
              fontSize: { xs: '0.88rem', md: '1.05rem' },
              letterSpacing: '0.04em',
              textShadow: '0 2px 10px rgba(0,0,0,0.55)',
            }}
          >
            {category.subtitle}
          </Typography>
        </Stack>
      ) : null}

      {showQuote ? (
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 14, md: 56 },
            top: { xs: '46%', md: '44%' },
            maxWidth: { xs: 170, sm: 240, md: 290 },
            transform: 'translateY(-18%)',
            display: { xs: 'none', sm: 'block' },
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              fontStyle: 'italic',
              color: 'rgba(255,248,231,0.94)',
              fontSize: { sm: '0.95rem', md: '1.18rem' },
              lineHeight: 1.55,
              textShadow: '0 3px 16px rgba(0,0,0,0.7)',
            }}
          >
            “{category.quote}”
          </Typography>
          <Iconify
            icon="solar:heart-bold"
            width={16}
            sx={{ mt: 1, color: accent, opacity: 0.85 }}
          />
        </Box>
      ) : null}

      {footer ? (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: { xs: 16, md: 24 },
            px: 2,
            zIndex: 1,
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
