'use client';

import type { ReactNode } from 'react';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

import { CinemaRibbonTitle } from './cinema-ribbon-title';
import { CINEMA_GOLD, CINEMA_CREAM, CINEMA_SERIF } from './cinema-theater-theme';
import {
  getNextFilmScreening,
  getScreeningShowStatus,
  getScreeningScheduleLabels,
  getCinemaFilmShowStatusLabel,
  isCinemaPreviewScreening,
} from './cinema-film-schedule';

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
  /** Stretch to fill a CSS grid cell instead of fixed carousel width. */
  fillWidth?: boolean;
};

export function CinemaPosterCard({
  film,
  accent = CINEMA_GOLD,
  metaLabel,
  screening,
  showScheduleOverlay = true,
  onClick,
  actions,
  fillWidth = false,
}: PosterCardProps) {
  const [posterUrl, setPosterUrl] = useState('');
  const nextScreening = screening ?? getNextFilmScreening(film);
  const showStatus = nextScreening ? getScreeningShowStatus(nextScreening) : 'unscheduled';
  const showStatusLabel = getCinemaFilmShowStatusLabel(showStatus);
  const showScheduleLabels = nextScreening ? getScreeningScheduleLabels(nextScreening) : [];
  const isPreview = isCinemaPreviewScreening(nextScreening);

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
        width: fillWidth ? '100%' : { xs: 148, sm: 168, md: 180 },
        flexShrink: fillWidth ? undefined : 0,
        position: 'relative',
        scrollSnapAlign: fillWidth ? undefined : 'start',
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

          {showScheduleOverlay && (showStatusLabel || isPreview) ? (
            <Stack
              direction="column"
              spacing={0.5}
              alignItems="flex-start"
              sx={{ position: 'absolute', top: 8, left: 8, right: 44, zIndex: 1 }}
            >
              {showStatusLabel ? (
                <Chip
                  size="small"
                  label={showStatusLabel}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    bgcolor: 'rgba(0,0,0,0.72)',
                    color: '#FFF8E7',
                    border: `1px solid ${accent}66`,
                  }}
                />
              ) : null}
              {isPreview ? (
                <Chip
                  size="small"
                  label="Preview"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    bgcolor: 'rgba(156,39,176,0.88)',
                    color: '#FFF8E7',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                />
              ) : null}
            </Stack>
          ) : null}

          {showScheduleOverlay && showScheduleLabels.length ? (
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
              <Stack spacing={0.1}>
                {showScheduleLabels.map((label) => (
                  <Typography
                    key={label}
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: CINEMA_CREAM,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      fontSize: '0.68rem',
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Stack>
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
  description?: string;
  headerAction?: ReactNode;
  showRibbon?: boolean;
  /** `grid` shows 6 posters per row on desktop; `carousel` keeps horizontal scroll. */
  layout?: 'carousel' | 'grid';
  renderActions?: (film: ICinemaFilm) => ReactNode;
  onSelectFilm?: (film: ICinemaFilm) => void;
};

export function CinemaFilmPosterCarousel({
  title,
  accent = CINEMA_GOLD,
  films,
  emptyMessage = 'No films added yet.',
  description,
  headerAction,
  showRibbon = true,
  layout = 'carousel',
  renderActions,
  onSelectFilm,
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isGrid = layout === 'grid';

  const scrollCarousel = (direction: 'prev' | 'next') => {
    const node = carouselRef.current;
    if (!node) return;
    const amount = Math.min(360, node.clientWidth * 0.7);
    node.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  const titleBlock =
    title || description ? (
      <Box sx={{ minWidth: 0 }}>
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
        ) : null}
        {description ? (
          <Box
            sx={{
              mt: title ? 1 : 0,
              px: 1.5,
              py: 1.1,
              borderRadius: 1.5,
              maxWidth: 760,
              bgcolor: `${accent}18`,
              border: `1px solid ${accent}66`,
              boxShadow: `0 0 0 1px ${accent}22 inset`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: accent,
                fontWeight: 700,
                lineHeight: 1.55,
              }}
            >
              {description}
            </Typography>
          </Box>
        ) : null}
      </Box>
    ) : (
      <Box />
    );

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
      ) : headerAction || title || description ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          {titleBlock}
          {headerAction}
        </Stack>
      ) : null}

      {showRibbon && description ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.1,
            borderRadius: 1.5,
            maxWidth: 760,
            bgcolor: `${accent}18`,
            border: `1px solid ${accent}66`,
            boxShadow: `0 0 0 1px ${accent}22 inset`,
            mt: -1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: accent,
              fontWeight: 700,
              lineHeight: 1.55,
            }}
          >
            {description}
          </Typography>
        </Box>
      ) : null}

      {films.length ? (
        isGrid ? (
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 1.5, sm: 2, md: 2.25 },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(6, minmax(0, 1fr))',
              },
            }}
          >
            {films.map((film) => (
              <CinemaPosterCard
                key={film.id}
                film={film}
                accent={accent}
                fillWidth
                onClick={onSelectFilm ? () => onSelectFilm(film) : undefined}
                actions={renderActions?.(film)}
              />
            ))}
          </Box>
        ) : (
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
        )
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
