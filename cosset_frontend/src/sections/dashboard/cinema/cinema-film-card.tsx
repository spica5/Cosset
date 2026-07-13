'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  formatScreeningSchedule,
  getNextFilmScreening,
  getScreeningShowStatus,
  getCinemaFilmShowStatusLabel,
} from './cinema-film-schedule';

// ----------------------------------------------------------------------

type Props = {
  film: ICinemaFilm;
  canManage?: boolean;
  onEdit?: (film: ICinemaFilm) => void;
  onDelete?: (film: ICinemaFilm) => void;
};

const resolvePosterImage = async (posterImage?: string | null) => {
  const normalized = (posterImage || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return (await getS3SignedUrl(normalized)) || normalized;
};

export function CinemaFilmCard({ film, canManage, onEdit, onDelete }: Props) {
  const [posterUrl, setPosterUrl] = useState('');
  const nextScreening = getNextFilmScreening(film);
  const showStatus = nextScreening ? getScreeningShowStatus(nextScreening) : 'unscheduled';
  const showStatusLabel = getCinemaFilmShowStatusLabel(showStatus);
  const showScheduleLabel = nextScreening ? formatScreeningSchedule(nextScreening) : null;

  useEffect(() => {
    let mounted = true;

    const loadPoster = async () => {
      const resolved = await resolvePosterImage(film.posterImage);

      if (mounted) {
        setPosterUrl(resolved);
      }
    };

    loadPoster();

    return () => {
      mounted = false;
    };
  }, [film.posterImage]);

  return (
    <Card
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          pt: '140%',
          position: 'relative',
          bgcolor: 'background.neutral',
        }}
      >
        {posterUrl ? (
          <Box
            component="img"
            src={posterUrl}
            alt={film.title}
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="solar:clapperboard-play-bold" width={40} />
          </Stack>
        )}

        {canManage ? (
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton
              size="small"
              color="default"
              onClick={() => onEdit?.(film)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>

            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete?.(film)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Stack>
        ) : null}
      </Box>

      <Stack spacing={0.75} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ minHeight: 48 }}>
          {film.title}
        </Typography>

        {film.director || film.year ? (
          <Typography variant="caption" color="text.secondary">
            {[film.director, film.year].filter(Boolean).join(' · ')}
          </Typography>
        ) : null}

        {showScheduleLabel ? (
          <Stack spacing={0.75}>
            {showStatusLabel ? (
              <Chip
                size="small"
                label={showStatusLabel}
                color={showStatus === 'now' ? 'success' : showStatus === 'upcoming' ? 'info' : 'default'}
                variant={showStatus === 'past' ? 'outlined' : 'filled'}
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
            ) : null}

            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {showScheduleLabel}
            </Typography>
          </Stack>
        ) : null}

        {film.description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {film.description}
          </Typography>
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Link
            href={film.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            Watch film
            <Iconify icon="eva:external-link-fill" width={16} />
          </Link>
        </Box>
      </Stack>
    </Card>
  );
}
