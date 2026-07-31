'use client';

import type { ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';
import type { CinemaFilmShowStatus } from 'src/sections/dashboard/cinema/cinema-film-schedule';

import { useMemo, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import {
  Carousel,
  useCarousel,
  CarouselDotButtons,
  CarouselArrowFloatButtons,
} from 'src/components/dashboard/carousel';

import {
  type CinemaCategory,
  type CinemaCategoryMeta,
  getCinemaCategory,
} from 'src/sections/dashboard/cinema/cinema-categories';
import {
  getNextScreeningStart,
  getScreeningShowStatus,
  getCinemaFilmShowStatusLabel,
  getScreeningScheduleLabels,
} from 'src/sections/dashboard/cinema/cinema-film-schedule';

// ----------------------------------------------------------------------

type UpcomingCinemaItem = {
  key: string;
  screening: ICinemaFilmScreeningWithFilm;
  category: CinemaCategoryMeta;
  status: Extract<CinemaFilmShowStatus, 'now' | 'upcoming'>;
  sortAt: number;
};

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

function buildUpcomingItems(
  screenings: ICinemaFilmScreeningWithFilm[],
  category: CinemaCategoryMeta,
  now: Date,
): UpcomingCinemaItem[] {
  const items: UpcomingCinemaItem[] = [];

  screenings.forEach((screening) => {
    const status = getScreeningShowStatus(screening, now);
    if (status !== 'now' && status !== 'upcoming') {
      return;
    }

    const nextStart = getNextScreeningStart(screening, now);
    items.push({
      key: `${category.id}-${screening.id}`,
      screening,
      category,
      status,
      sortAt:
        status === 'now' ? now.getTime() : (nextStart?.getTime() ?? Number.MAX_SAFE_INTEGER),
    });
  });

  return items;
}

function UpcomingCinemaCard({ item }: { item: UpcomingCinemaItem }) {
  const [posterUrl, setPosterUrl] = useState('');
  const scheduleLabels = getScreeningScheduleLabels(item.screening);
  const statusLabel = getCinemaFilmShowStatusLabel(item.status);
  const ownerId = String(item.screening.customerId || '').trim();
  const cinemaHref = ownerId
    ? `${paths.dashboard.community.cinema.view(item.category.id)}?ownerId=${encodeURIComponent(ownerId)}`
    : paths.dashboard.community.cinema.view(item.category.id);

  useEffect(() => {
    let mounted = true;
    resolvePosterImage(item.screening.filmPosterImage).then((url) => {
      if (mounted) setPosterUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [item.screening.filmPosterImage]);

  return (
    <Card
      sx={{
        height: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '16 / 9',
          bgcolor: 'grey.200',
          overflow: 'hidden',
        }}
      >
        {posterUrl ? (
          <Box
            component="img"
            src={posterUrl}
            alt={item.screening.filmTitle}
            sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 1, color: 'text.disabled' }}>
            <Iconify icon="solar:clapperboard-play-bold" width={28} />
          </Stack>
        )}

        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          sx={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 1 }}
        >
          {statusLabel ? (
            <Chip
              size="small"
              label={statusLabel}
              color={item.status === 'now' ? 'success' : 'warning'}
              sx={{
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            />
          ) : null}
          <Chip
            size="small"
            variant="outlined"
            label={item.category.shortTitle}
            sx={{
              borderColor: item.category.accent,
              color: item.category.accent,
              fontWeight: 600,
              bgcolor: 'rgba(255,255,255,0.92)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}
          />
        </Stack>
      </Box>

      <Stack spacing={1} sx={{ p: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
          {item.screening.filmTitle}
        </Typography>

        {scheduleLabels.length ? (
          <Stack spacing={0.1}>
            {scheduleLabels.map((label) => (
              <Typography key={label} variant="caption" color="text.secondary" noWrap>
                {label}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Scheduled screening
          </Typography>
        )}

        <Button
          component={RouterLink}
          href={cinemaHref}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="contained"
          fullWidth
          endIcon={<Iconify icon="solar:play-bold" width={16} />}
          sx={{
            mt: 0.5,
            bgcolor: item.category.accent,
            color: '#1A1208',
            fontWeight: 800,
            '&:hover': { bgcolor: item.category.accent, opacity: 0.92 },
          }}
        >
          Enter room
        </Button>
      </Stack>
    </Card>
  );
}

function UpcomingCinemaListCarousel({ items }: { items: UpcomingCinemaItem[] }) {
  const carousel = useCarousel({
    align: 'start',
    slideSpacing: '16px',
    slidesToShow: { xs: 1, sm: 3, md: 4 },
  });

  const showControls = items.length > 1;

  return (
    <Box sx={{ position: 'relative', px: { xs: 0, sm: 0.5 } }}>
      {showControls ? (
        <CarouselArrowFloatButtons
          {...carousel.arrows}
          options={carousel.options}
          sx={{
            color: 'text.primary',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
            '&:hover': { opacity: 1, bgcolor: 'background.neutral' },
          }}
          slotProps={{
            prevBtn: { sx: { left: { xs: -4, sm: -18 } } },
            nextBtn: { sx: { right: { xs: -4, sm: -18 } } },
          }}
        />
      ) : null}

      <Carousel carousel={carousel}>
        {items.map((item) => (
          <UpcomingCinemaCard key={item.key} item={item} />
        ))}
      </Carousel>

      {showControls ? (
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <CarouselDotButtons
            scrollSnaps={carousel.dots.scrollSnaps}
            selectedIndex={carousel.dots.selectedIndex}
            onClickDot={carousel.dots.onClickDot}
            sx={{ color: 'primary.main' }}
          />
        </Stack>
      ) : null}
    </Box>
  );
}

function useCategoryUpcoming(categoryId: CinemaCategory) {
  const category = getCinemaCategory(categoryId)!;
  const { screenings, screeningsLoading, screeningsError } = useGetCinemaScreenings(
    null,
    categoryId,
    { publicOnly: true },
  );

  const items = useMemo(
    () => buildUpcomingItems(screenings, category, new Date()),
    [category, screenings],
  );

  return { items, loading: screeningsLoading, error: screeningsError };
}

export function OverviewUpcomingCinema() {
  const classic = useCategoryUpcoming('classic');
  const genre = useCategoryUpcoming('genre');
  const drama = useCategoryUpcoming('drama');

  const loading = classic.loading || genre.loading || drama.loading;

  const upcomingItems = useMemo(
    () =>
      [...classic.items, ...genre.items, ...drama.items].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'now' ? -1 : 1;
        }
        return a.sortAt - b.sortAt;
      }),
    [classic.items, drama.items, genre.items],
  );

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.35}>
          <Typography variant="h5">Upcoming cinema</Typography>
          <Typography variant="body2" color="text.secondary">
            Live and upcoming screenings across Classic, Genre, and Drama rooms.
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.cinema.root}
          size="small"
          variant="outlined"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          Open cinema
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : upcomingItems.length ? (
        <UpcomingCinemaListCarousel items={upcomingItems} />
      ) : (
        <EmptyContent
          filled
          title="No upcoming screenings"
          description="When admins schedule showtimes, they will appear here."
          sx={{ py: 6 }}
        />
      )}
    </Card>
  );
}
