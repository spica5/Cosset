'use client';

import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/universe/iconify';

import { getMemorialThingCategoryLabel } from 'src/sections/dashboard/journey-diary/memorial-things-categories';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { MYSPACE_ITEM_TITLE_FONT } from './myspace-section-title';
import {
  filterUniverseTrips,
  formatTripDateRange,
  getJourneyGroupKey,
  buildUniverseTripsForMemorialThings,
  type UniverseTripFilter,
} from './universe-landing-journey-diary-my-journey-utils';
import {
  getJourneyPalette,
  JourneyDiaryMyTripsPanel,
} from './universe-landing-journey-diary-my-trips-panel';

import type {
  JourneyMemorialDetailItem,
  JourneyPictureDetailItem,
} from './universe-landing-journey-diary-detail-dialog';

// ----------------------------------------------------------------------

type Props = {
  memorialThings: JourneyMemorialDetailItem[];
  pictures: JourneyPictureDetailItem[];
  locations: IJourneyDiaryLocation[];
  loading?: boolean;
  onOpenMemorial: (items: JourneyMemorialDetailItem[], index: number) => void;
};

function formatMemorialDate(item: JourneyMemorialDetailItem) {
  const value = item.memorialDate || item.createdAt;
  if (!value) {
    return 'No date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No date';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MemorialListCard({
  item,
  onClick,
  palette,
}: {
  item: JourneyMemorialDetailItem;
  onClick: () => void;
  palette: ReturnType<typeof getJourneyPalette>;
}) {
  const imageUrl = item.signedImageUrl || item.signedImageUrls?.[0] || '';
  const excerpt = (item.description || '').trim() || 'No description yet.';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: palette.border,
        bgcolor: palette.panelActive,
        overflow: 'hidden',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} alignItems="stretch">
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={item.title}
              sx={{
                width: { xs: 1, sm: 140 },
                height: { xs: 160, sm: 120 },
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: { xs: 1, sm: 140 },
                height: { xs: 120, sm: 120 },
                flexShrink: 0,
                bgcolor: palette.panel,
                color: palette.muted,
              }}
            >
              <Iconify icon="solar:heart-bold" width={28} />
            </Stack>
          )}

          <Stack spacing={0.75} sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: palette.accent, fontWeight: 700 }}>
              {getMemorialThingCategoryLabel(item.category)} · {formatMemorialDate(item)}
            </Typography>
            <Typography
              sx={{
                fontFamily: MYSPACE_ITEM_TITLE_FONT,
                fontWeight: 700,
                color: palette.ink,
              }}
              noWrap
            >
              {item.title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: palette.muted,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.6,
              }}
            >
              {excerpt}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingJourneyDiaryMyMemorialThings({
  memorialThings,
  pictures,
  locations,
  loading = false,
  onOpenMemorial,
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const palette = useMemo(() => getJourneyPalette(spaceTheme), [spaceTheme]);
  const trips = useMemo(
    () => buildUniverseTripsForMemorialThings(pictures, memorialThings, locations),
    [locations, memorialThings, pictures],
  );

  const [tripFilter, setTripFilter] = useState<UniverseTripFilter>('all');
  const [selectedTripKey, setSelectedTripKey] = useState<string | null>(null);

  const filteredTrips = useMemo(
    () => filterUniverseTrips(trips, tripFilter),
    [tripFilter, trips],
  );

  const selectedTrip = useMemo(() => {
    const fallback = filteredTrips[0] || trips[0] || null;
    if (!selectedTripKey) {
      return fallback;
    }

    return filteredTrips.find((trip) => trip.groupKey === selectedTripKey) || fallback;
  }, [filteredTrips, selectedTripKey, trips]);

  const tripMemorialThings = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    return memorialThings
      .filter((item) => getJourneyGroupKey(item) === selectedTrip.groupKey)
      .sort((a, b) => {
        const aTime = new Date(a.memorialDate || a.createdAt || 0).getTime();
        const bTime = new Date(b.memorialDate || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [memorialThings, selectedTrip]);

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Loading journey diary...
      </Typography>
    );
  }

  if (!trips.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No shared memorial things found.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: palette.paper,
        border: palette.border,
        backgroundImage: `linear-gradient(${palette.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${palette.gridLine} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}
    >
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2.5} alignItems="stretch">
          <JourneyDiaryMyTripsPanel
            filteredTrips={filteredTrips}
            tripFilter={tripFilter}
            selectedTripKey={selectedTrip?.groupKey ?? null}
            palette={palette}
            spaceTheme={spaceTheme}
            countLabel="memorial"
            getTripCount={(trip) => trip.memorialCount || 0}
            onFilterChange={(filter) => {
              setTripFilter(filter);
              setSelectedTripKey(null);
            }}
            onSelectTrip={setSelectedTripKey}
          />

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 2,
              border: palette.border,
              bgcolor: palette.panelActive,
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:heart-bold" width={18} sx={{ color: palette.accent }} />
                <Typography
                  sx={{
                    fontFamily: spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT,
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: palette.ink,
                  }}
                >
                  Memorial Things
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Special memories and keepsakes from each journey.
              </Typography>
            </Stack>

            {selectedTrip ? (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ color: palette.ink, fontWeight: 700 }}>
                  {selectedTrip.country}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTripDateRange(selectedTrip.visitedAt, selectedTrip.endAt)}
                  {selectedTrip.journeyName ? ` · ${selectedTrip.journeyName}` : ''}
                </Typography>
              </Box>
            ) : null}

            {tripMemorialThings.length ? (
              <Stack spacing={1.5}>
                {tripMemorialThings.map((item, index) => (
                  <MemorialListCard
                    key={item.id}
                    item={item}
                    palette={palette}
                    onClick={() => onOpenMemorial(tripMemorialThings, index)}
                  />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4 }}>
                No memorial things for this trip yet.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
