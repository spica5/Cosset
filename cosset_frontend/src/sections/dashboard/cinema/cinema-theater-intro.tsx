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
  showEyebrow?: boolean;
  /** Content rendered above the banner title (e.g. today's date). */
  top?: ReactNode;
  /** Content rendered in the vertical middle of the banner (e.g. calendar). */
  middle?: ReactNode;
  footer?: ReactNode;
  /** Override banner (e.g. original hub intro on community/cinema). */
  bannerImage?: string;
  headline?: string;
  subtitle?: string;
};

export function CinemaTheaterIntro({
  category,
  height = { xs: 320, md: 480 },
  showQuote = true,
  showTitles = true,
  showEyebrow = true,
  top,
  middle,
  footer,
  bannerImage,
  headline,
  subtitle,
}: Props) {
  const accent = category.accent || CINEMA_GOLD;
  const imageSrc = bannerImage || category.bannerImage;
  const title = headline ?? category.headline;
  const description = subtitle ?? category.subtitle;

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        borderRadius: { xs: 2, md: 3 },
        overflow: 'hidden',
        border: `1px solid ${accent}44`,
        boxShadow: `0 28px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset`,
        height: middle ? 'auto' : height,
        minHeight: middle ? { xs: 560, md: 620 } : height,
        display: middle ? 'flex' : 'block',
        flexDirection: middle ? 'column' : undefined,
      }}
    >
      <Box
        component="img"
        src={imageSrc}
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
            ? middle
              ? 'linear-gradient(180deg, rgba(8,5,3,0.78) 0%, rgba(8,5,3,0.55) 28%, rgba(8,5,3,0.5) 55%, rgba(8,5,3,0.78) 100%)'
              : 'linear-gradient(180deg, rgba(8,5,3,0.62) 0%, rgba(8,5,3,0.12) 36%, rgba(8,5,3,0.08) 58%, rgba(8,5,3,0.55) 100%)'
            : 'linear-gradient(180deg, rgba(8,5,3,0.28) 0%, rgba(8,5,3,0.08) 36%, rgba(8,5,3,0.12) 58%, rgba(8,5,3,0.58) 100%)',
          pointerEvents: 'none',
        }}
      />

      {top ? (
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            pt: { xs: 1.25, md: 1.5 },
            px: 2,
          }}
        >
          {top}
        </Box>
      ) : null}

      {showTitles ? (
        <Stack
          spacing={middle ? 0.75 : 1.25}
          alignItems="center"
          sx={{
            position: middle ? 'relative' : 'absolute',
            top: middle ? 0 : { xs: 22, md: 40 },
            left: 0,
            right: 0,
            pt: middle ? { xs: 2, md: 2.5 } : 0,
            px: 2,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          {showEyebrow ? (
            <Typography
              sx={{
                fontFamily: category.fontFamily || CINEMA_SERIF,
                color: accent,
                letterSpacing: category.id === 'genre' ? '0.34em' : '0.28em',
                fontSize: { xs: '0.72rem', md: '0.88rem' },
                textTransform: 'uppercase',
                fontWeight: 600,
                textShadow: '0 2px 12px rgba(0,0,0,0.55)',
              }}
            >
              {category.eyebrow}
            </Typography>
          ) : null}

          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.25 }}
            alignItems="center"
            justifyContent="center"
            sx={{ maxWidth: 900, px: 1 }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: middle
                  ? { xs: 26, sm: 32, md: 38 }
                  : { xs: 30, sm: 38, md: 46 },
                height: middle
                  ? { xs: 26, sm: 32, md: 38 }
                  : { xs: 30, sm: 38, md: 46 },
                display: 'grid',
                placeItems: 'center',
                color: accent,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.55))',
                '& svg': { width: '100%', height: '100%' },
              }}
            >
              <Iconify icon={category.icon || 'solar:videocamera-record-bold'} width={36} />
            </Box>
            <Typography
              sx={{
                fontFamily: category.fontFamily || CINEMA_SERIF,
                color: accent,
                fontWeight: 700,
                fontSize: middle
                  ? { xs: '1.25rem', sm: '1.65rem', md: '2.1rem' }
                  : { xs: '1.55rem', sm: '2.15rem', md: '2.85rem' },
                letterSpacing: category.id === 'genre' ? '0.1em' : '0.06em',
                lineHeight: 1.12,
                textTransform: 'uppercase',
                textAlign: 'left',
                textShadow:
                  category.id === 'genre'
                    ? `0 0 28px rgba(${category.accentRgb}, 0.45), 0 4px 22px rgba(0,0,0,0.65)`
                    : '0 4px 22px rgba(0,0,0,0.65)',
              }}
            >
              {title}
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: category.mutedTextColor || 'rgba(245,230,200,0.9)',
              fontSize: middle
                ? { xs: '0.78rem', md: '0.95rem' }
                : { xs: '0.88rem', md: '1.05rem' },
              letterSpacing: '0.04em',
              textShadow: '0 2px 10px rgba(0,0,0,0.55)',
              maxWidth: 640,
              display: middle ? { xs: 'none', sm: 'block' } : 'block',
            }}
          >
            {description}
          </Typography>
        </Stack>
      ) : null}

      {middle ? (
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 1.5, md: 2 },
            px: { xs: 0.5, md: 1 },
          }}
        >
          {middle}
        </Box>
      ) : null}

      {showQuote && !middle ? (
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
            position: middle ? 'relative' : 'absolute',
            left: 0,
            right: 0,
            bottom: middle ? 0 : { xs: 16, md: 24 },
            px: 2,
            pb: middle ? { xs: 2, md: 2.5 } : 0,
            zIndex: 1,
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
