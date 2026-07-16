'use client';

import type { ReactNode } from 'react';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';

import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

import { CinemaRibbonTitle } from './cinema-ribbon-title';
import {
  formatScreeningSchedule,
  getCinemaFilmShowStatusLabel,
  getNextFilmScreening,
  getScreeningShowStatus,
} from './cinema-film-schedule';
import { CINEMA_CREAM, CINEMA_GOLD, CINEMA_SERIF } from './cinema-theater-theme';

// ----------------------------------------------------------------------

async function resolvePosterImage(posterImage?: string | null) {
  const normalized = (posterImage || '').trim();
  if (!normalized) return '';
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/')
  ) {
    return normalized;
  }
  return (await getS3SignedUrl(normalized)) || normalized;
}

type PosterCardProps = {
  film: ICinemaFilm;
  accent?: string;
  metaLabel?: string;
  screening?: ICinemaFilmScreening | null;
  showScheduleOverlay?: boolean;
  onClick?: () => void;
  actions?: ReactNode;
};

export function CinemaPosterCard({
  film,
  accent = CINEMA_GOLD,
  metaLabel,
  screening,
  showScheduleOverlay = true,
  onClick,
  actions,
}: PosterCardProps) {
  const [posterUrl, setPosterUrl] = useState('');
  const nextScreening = screening ?? getNextFilmScreening(film);
  const showStatus = nextScreening ? getScreeningShowStatus(nextScreening) : 'unscheduled';
  const showStatusLabel = getCinemaFilmShowStatusLabel(showStatus);
  const showScheduleLabel = nextScreening ? formatScreeningSchedule(nextScreening) : null;

  useEffect(() => {
    let mounted = true;
    resolvePosterImage(film.posterImage).then((url) => {
      if (mounted) setPosterUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [film.posterImage]);

  return (
    <Box
      sx={{
        width: { xs: 148, sm: 168, md: 180 },
        flexShrink: 0,
        position: 'relative',
        scrollSnapAlign: 'start',
      }}
    >
      {actions ? (
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          {actions}
        </Stack>
      ) : null}

      <Box
        component={onClick ? 'button' : 'div'}
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        sx={{
          width: 1,
          p: 0,
          border: 'none',
          bgcolor: 'transparent',
          cursor: onClick ? 'pointer' : 'default',
          textAlign: 'left',
          color: 'inherit',
          transition: (theme) =>
            theme.transitions.create(['transform', 'opacity'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': onClick
            ? {
                opacity: 1,
                transform: 'translateY(-4px)',
              }
            : undefined,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            pt: '148%',
            borderRadius: 1.5,
            overflow: 'hidden',
            border: `1px solid ${accent}38`,
            boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
            bgcolor: '#1A1410',
          }}
        >
          {posterUrl ? (
            <Box
              component="img"
              src={posterUrl}
              alt={film.title}
              sx={{
                position: 'absolute',
                inset: 0,
                width: 1,
                height: 1,
                objectFit: 'cover',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ position: 'absolute', inset: 0, color: 'rgba(255,255,255,0.35)' }}
            >
              <Iconify icon="solar:clapperboard-play-bold" width={34} />
            </Stack>
          )}

          {showScheduleOverlay && showStatusLabel ? (
            <Chip
              size="small"
              label={showStatusLabel}
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 1,
                height: 22,
                fontWeight: 700,
                bgcolor: 'rgba(0,0,0,0.72)',
                color: '#FFF8E7',
                border: `1px solid ${accent}66`,
              }}
            />
          ) : null}

          {showScheduleOverlay && showScheduleLabel ? (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                px: 1,
                pt: 3,
                pb: 1,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.88) 70%)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: CINEMA_CREAM,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  fontSize: '0.68rem',
                }}
              >
                {showScheduleLabel}
              </Typography>
            </Box>
          ) : null}
        </Box>

        <Stack spacing={0.45} sx={{ mt: 1.25, px: 0.25 }}>
          <Typography
            sx={{
              fontFamily: CINEMA_SERIF,
              fontWeight: 600,
              fontSize: '0.95rem',
              color: CINEMA_CREAM,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.5em',
            }}
          >
            {film.title}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Iconify icon="solar:star-bold" width={13} sx={{ color: accent }} />
            <Typography variant="caption" sx={{ color: accent, fontWeight: 700 }}>
              {film.year || '—'}
            </Typography>
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(245, 230, 200, 0.62)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {metaLabel || [film.director, film.year].filter(Boolean).join(' · ') || 'Feature film'}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

type CarouselProps = {
  title?: string;
  accent?: string;
  films: ICinemaFilm[];
  emptyMessage?: string;
  headerAction?: ReactNode;
  showRibbon?: boolean;
  renderActions?: (film: ICinemaFilm) => ReactNode;
  onSelectFilm?: (film: ICinemaFilm) => void;
};

export function CinemaFilmPosterCarousel({
  title,
  accent = CINEMA_GOLD,
  films,
  emptyMessage = 'No films added yet.',
  headerAction,
  showRibbon = true,
  renderActions,
  onSelectFilm,
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'prev' | 'next') => {
    const node = carouselRef.current;
    if (!node) return;
    const amount = Math.min(360, node.clientWidth * 0.7);
    node.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <Stack spacing={2.5}>
      {showRibbon && title ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1.5}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ flex: 1, minWidth: 0, justifyContent: 'center' }}
          >
            <Box
              sx={{
                flex: 1,
                height: 1,
                maxWidth: { xs: 48, sm: 120, md: 180 },
                bgcolor: `${accent}55`,
              }}
            />
            <CinemaRibbonTitle title={title} accent={accent} />
            <Box
              sx={{
                flex: 1,
                height: 1,
                maxWidth: { xs: 48, sm: 120, md: 180 },
                bgcolor: `${accent}55`,
              }}
            />
          </Stack>

          {headerAction}
        </Stack>
      ) : headerAction || title ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          {title ? (
            <Typography
              sx={{
                fontFamily: CINEMA_SERIF,
                fontWeight: 700,
                fontSize: '1.15rem',
                color: CINEMA_CREAM,
              }}
            >
              {title}
            </Typography>
          ) : (
            <Box />
          )}
          {headerAction}
        </Stack>
      ) : null}

      {films.length ? (
        <Box sx={{ position: 'relative' }}>
          <IconButton
            aria-label="Previous films"
            onClick={() => scrollCarousel('prev')}
            sx={{
              position: 'absolute',
              left: { xs: -4, md: -14 },
              top: '34%',
              zIndex: 2,
              width: 42,
              height: 42,
              bgcolor: 'rgba(18,12,8,0.82)',
              border: `1px solid ${accent}66`,
              color: CINEMA_CREAM,
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': { bgcolor: 'rgba(30,20,12,0.95)' },
            }}
          >
            <Iconify icon="eva:arrow-ios-back-fill" />
          </IconButton>

          <IconButton
            aria-label="Next films"
            onClick={() => scrollCarousel('next')}
            sx={{
              position: 'absolute',
              right: { xs: -4, md: -14 },
              top: '34%',
              zIndex: 2,
              width: 42,
              height: 42,
              bgcolor: 'rgba(18,12,8,0.82)',
              border: `1px solid ${accent}66`,
              color: CINEMA_CREAM,
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': { bgcolor: 'rgba(30,20,12,0.95)' },
            }}
          >
            <Iconify icon="eva:arrow-ios-forward-fill" />
          </IconButton>

          <Stack
            ref={carouselRef}
            direction="row"
            spacing={2.25}
            sx={{
              overflowX: 'auto',
              px: { xs: 0.5, sm: 3 },
              py: 1,
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {films.map((film) => (
              <CinemaPosterCard
                key={film.id}
                film={film}
                accent={accent}
                onClick={onSelectFilm ? () => onSelectFilm(film) : undefined}
                actions={renderActions?.(film)}
              />
            ))}
          </Stack>
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: 'rgba(245,230,200,0.68)', textAlign: 'center', py: 4, lineHeight: 1.8 }}
        >
          {emptyMessage}
        </Typography>
      )}
    </Stack>
  );
}
